import express from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient, ObjectId } from 'mongodb'
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
let lastMessages;

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

  const validation = participantSchema.validate(participant, { pick: "name", abortEarly: false })
  console.log(validation)

  if (validation.error) {
    const errors = validation.error.details.map((err) => {
      return err.message
    })
    return res.status(422).send(errors)
  }


  try {

    const nameExists = await db.collection("participants").findOne({ name: participant.name })

    if (nameExists) return res.status(409).send("Esse nome já está cadastrado!")

    await db.collection("participants").insertOne({ name: participant.name, lastStatus: Date.now() })

    await db.collection("messages").insertOne({ from: participant.name, to: "Todos", text: "entra na sala...", type: "status", time: date })

    res.status(201).send("Usuário criado!")

  } catch (err) {
    console.log(err)
  }
})

server.get("/participants", async (req, res) => {
  db.collection("participants").find().toArray().then(data => {
    return res.send(data)
  }).catch(() => {
    res.status(500).send("Deu zica no servidor de banco de dados")
  })
})

server.post("/messages", async (req, res) => {
  const message = req.body
  const { user } = req.headers

  const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
  })

  const validation = messageSchema.validate(message, { pick: ['to', 'text', 'type'], abortEarly: false })
  console.log(validation)

  if (validation.error) {
    const errors = validation.error.details.map((err) => {
      return err.message
    })
    return res.status(422).send(errors)
  }

  try {

    let userExists = await db.collection("participants.name").findOne({ name: user })

  } catch {
    res.sendStatus(422)
  }


  try {
    await db.collection("messages").insertOne({ from: user, to: message.to, text: message.text, type: message.type, time: date })

    res.status(201).send("Mensagem enviada!")

  } catch (err) {
    console.log(err)
  }
})

server.get("/messages", async (req, res) => {
  let { limit } = req.query
  let { user } = req.headers
  const messages = await db.collection("messages").find().toArray()

  let visibleMessages = messages.filter((m) =>
    m.user === user ||
    m.type === "message" ||
    m.to === user && m.type === "private_message" ||
    m.from === user && m.type === "private_message" ||
    m.type === "status"
  );

  res.send(visibleMessages.splice(-limit))

})

server.post("/status", async (req, res) => {
  const { user } = req.headers
  try {
    const userExists = await db.collection("participants.name").findOne({ name: user })
    if(!userExists) return res.sendStatus(404)

    await db.collection("participants").updatetOne({ name:user }, { $set: { lastStatus: Date.now() } })
    res.sendStatus(200)

  } catch {
    res.sendStatus(500)
  }
})



  setInterval (async () => {
    let participants =  await db.collection("participants").find().toArray()

  participants.forEach(async p => {
    if(Date.now() - p.lastStatus > 10000){
      await db.collection("participants").deleteOne({name: p.name})

      await db.collection("messages").insertOne({from: p.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: date})
    }
  })
}, 15000)


server.listen(5000, () => console.log(chalk.blue('Servidor roudou de boas aqui')))