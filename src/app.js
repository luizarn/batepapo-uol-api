import express from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient } from 'mongodb'
import joi from 'joi'
import dotenv from 'dotenv'
import dayjs from "dayjs";

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
const server = express()
server.use(express.json())
server.use(cors())
const date = dayjs().format("hh:mm:ss")

try {
    await mongoClient.connect()
    db = mongoClient.db("batepapo")
    console.log('Deu bom no server')
  } catch (error) {
    console.log('Deu errro no server')
  }



  

  server.post("/participants", async (req, res) => {
    const participant = req.body

    const participantSchema = joi.object({
        name: joi.string().required()
    })

    const validation = participantSchema.validate(participant, {pick: "name", abortEarly:false})
    console.log(validation)

    if (validation.error){
        const errors = validation.error.details.map((err) => {
            return err.message
        })
        return res.status(422).send(errors)
    }
  
  
    try {
  
      const nameExists = await db.collection("participants").findOne({ name: participant.name })
  
      if (nameExists) return res.status(409).send("Esse nome já está cadastrado!")
  
      await db.collection("participants").insertOne({ name: participant.name, lastStatus: Date.now() })
  
      res.send("ok")

     await db.collection("messages").findOne({ from: participant.name, to: "Todos", text: "entra na sala...", type: "status", time: date})

      res.sendStatus(201)
  
    } catch (err) {
      console.log(err)
    }
  })


server.listen(5000, () => console.log(chalk.blue('Servidor roudou de boas aqui')))