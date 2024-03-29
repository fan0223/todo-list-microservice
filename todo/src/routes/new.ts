import dotenv from 'dotenv';
dotenv.config();
import express, { Response, Request } from 'express'
import { Todo } from '../models/todo'
import { BadRequestError, NotFoundError, requireAuth, validateRequest } from '@fan-todo/common'
import { body } from 'express-validator'
import { todoCreatedPublisher } from '../events/publisher/todoCreatedPublisher';
import { s3Client } from '../events/s3-client';

import multer from 'multer';
import crypto from 'crypto';
import sharp from 'sharp';



const router = express.Router()
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const randomImageName = () => crypto.randomBytes(32).toString('hex');


router.post('/api/todo',
  requireAuth,
  upload.single('image'),
  [
    body('title')
      .not()
      .isEmpty()
      .withMessage('Title is required'),
    body('content')
      .not()
      .isEmpty()
      .withMessage('Content is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, content } = req.body

    if (!req.file) {
      throw new BadRequestError('Wrong cover image')
    }
    // // handle s3 and image upload
    const ImageBuffer = await sharp(req.file.buffer)
      .resize({ height: 1920 })
      .toBuffer()
    const imageName = randomImageName();

    if (!process.env.BUCKET_NAME) {
      throw new NotFoundError()
    }
    const putObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: imageName,
      Body: ImageBuffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    // S3 upload
    const putObjectWrapper = (params: any) => {
      return new Promise((resolve, reject) => {
        s3Client.putObject(params, function (err, result) {
          if (err) reject(err);
          if (result) resolve(result);
        });
      })
    }
    await putObjectWrapper(putObjectParams)
      .then(result => console.log(result))
      .catch(err => console.log(err))
    // s3Client.putObject(putObjectParams, function (err, data) {
    //   if (err) {
    //     console.log(err)
    //   }
    //   console.log(data)
    // });
    // After s3 upload image, fetch image url, store in database.
    // https://fan-demo-created.s3.ap-southeast-1.amazonaws.com/af3c295f7aa45559f71f3b81290458919b04bc05b22fcf2272e4fb6ffe2a51bd
    // const getUrlParams = {
    //   Bucket: process.env.BUCKET_NAME,
    //   Key: imageName
    // }
    // let imageUrl = s3Client.getSignedUrl('getObject', getUrlParams)
    const imageUrl = `https://fan-demo-created.s3.ap-southeast-1.amazonaws.com/${imageName}`
    const todo = Todo.build({
      title,
      content,
      userId: req.currentUser!.id,
      userEmail: req.currentUser!.email,
      createAt: new Date().toLocaleString(),
      imageName,
      imageUrl
    })

    await todo.save()

    new todoCreatedPublisher().publish({
      id: todo.id,
      title: todo.title,
      content: todo.content,
      userId: todo.userId,
      userEmail: todo.userEmail,
      createdAt: todo.createAt,
      imageName: todo.imageName,
      imageUrl: todo.imageUrl
    })

    res.status(201).send(todo)
  })

export { router as newTodoRouter }