import mongoose from 'mongoose'
import { app } from './app'
import { Config, redisMQ, todoCreatedQueueManager } from '@fan-todo/common'


const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined')
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined')
  }

  try {
    redisMQ.createInstance(Config, todoCreatedQueueManager)
    // redisMQ.createInstance(config, todoUpdated)

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 50000
    })

    // when mongoose start , delete all collections , prevent mongoDB bug
    const collections = await mongoose.connection.db.collections()

    for (let collection of collections) {
      await collection.deleteMany({})
    }


    console.log('Connected to mongoDB')
  } catch (error) {
    console.error(error)
  }

  app.listen(3000, () => {
    console.log('Listening on port 3000.')
  })
}

start()