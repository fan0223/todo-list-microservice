import express, { Response, Request } from 'express'
import { Todo } from '../model/todo'

const router = express.Router()

router.get('/api/todo', async (req: Request, res: Response) => {
  const todo = await Todo.find({})

  res.send(todo)
})

export { router as indexTodoRouter }