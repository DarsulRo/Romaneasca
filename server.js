const socketio = require('socket.io')
const http = require('http')
const express = require('express')

//EXPRESS SETTINGS
const app = express()
app.set('view engine', 'ejs')
app.use('/public',express.static('public'));
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//HTTP & SOCKET
const server = http.createServer(app)
const io = socketio(server)



app.get('/',(req,res)=>{
    res.render('landing.ejs');
})

app.get('/game',(req,res)=>{
    res.render('game.ejs')
})


//SOCKET 
io.on('connection', socket =>{

    socket.emit('message', 'yoo this is a message')

    socket.on('from', mes =>{
        console.log(mes)
    })
})


//STARTING SERVER
const PORT = 8000
server.listen(PORT,() =>{
    console.log(`Server running on port ${PORT}`)
})