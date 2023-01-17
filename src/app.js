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
  db = mongoClient.db()
  console.log('Deu bom no server')
} catch (error) {
  console.log('Deu errro no server')
}


server.post("/participants", async (req, res) => {
  const {name} = req.body

  const participantSchema = joi.object({
    name: joi.string().required()
  })

  const validation = participantSchema.validate({name})
  console.log(validation)

  if (validation.error) return res.status(422).send( validation.error.details)
      
  try {

    const nameExists = await db.collection("participants").findOne({ name })

    if (nameExists) return res.status(409).send("Esse nome já está cadastrado!")

    await db.collection("participants").insertOne({ name, lastStatus: Date.now() })

    await db.collection("messages").insertOne({ from: name, to: "Todos", text: "entra na sala...", type: "status", time: date })
    
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
  const { to, text, type} = req.body
  const { user } = req.headers

  const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
  })

  const validation = messageSchema.validate({to, text, type, from: user}, { abortEarly: false })
  console.log(validation)

  if (validation.error) {
    const errors = validation.error.details.map((err) => {
      return err.message
    })
    return res.status(422).send(errors)
  }

  try {
    let userExists = await db.collection("participants").findOne({ name: user })

    if(!userExists) return res.sendStatus(422)

    await db.collection("messages").insertOne({ from: user, to , text, type, time: date })

    res.status(201).send("Mensagem enviada!")

  } catch (err) {
    console.log(err)
    return res.sendStatus(500)
  }
})

server.get("/messages", async (req, res) => {
  let limit;
  let { user } = req.headers
  const messages = await db.collection("messages").find().toArray()


  if (req.query.limit) {
    limit = parseInt(req.query.limit);
    if (limit < 1 || isNaN(limit)) {
        res.status(422).send("Limite inválido");
        return;
    }
}


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
  let { user } = req.headers
  const userExists = await db.collection("participants").findOne({ name: user })


    if (!userExists) return res.sendStatus(404)

    await db.collection("participants").updatetOne({ name: user }, { $set: { lastStatus: Date.now() } })
    res.sendStatus(200)

})


setInterval(async () => {
  let participants = await db.collection("participants").find({ lastStatus: {$lte: Date.now() - 10000}}).toArray()

  participants.forEach(async p => {
    
      await db.collection("participants").deleteOne({ name: p.name })

      await db.collection("messages").insertOne({ from: p.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: date })
    
  })
}, 15000)


server.listen(5000, () => console.log(chalk.blue('Servidor roudou de boas aqui')))