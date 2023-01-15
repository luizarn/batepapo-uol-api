import express from 'express'
import cors from 'cors'
import chalk from 'chalk'

const app = express()
app.use(express.json())
app.use(cors())



const PORT = 5000

app.listen(PORT, () => console.log(chalk.blue(`Servidor roudou de boas aqui => ${PORT}`)))