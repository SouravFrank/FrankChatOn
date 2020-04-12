const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const path = require('path')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/msg')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirPath = path.join( __dirname, '../public')
const port = process.env.PORT || 8080

app.use(express.static(publicDirPath))


io.on('connection', (socket) => {
    console.log('io on!');
    socket.emit('message', generateMessage('Welcome!'))
    socket.broadcast.emit('message', generateMessage('New joined!'))
    socket.on('sendMessage', (text, callback) => {
        const filter = new Filter()

        if(filter.isProfane(text)) {
            return callback('Profanity not allowed!')
        }
        
        io.emit('message', generateMessage(text))
        callback('Delivered!')
    })
    socket.on('disconnect', () => {
        io.emit('message', generateMessage('One left!'))
    })
    socket.on('getLocation', ({lat,long}, callback) => {
        io.emit('locationMessage', generateLocationMessage(`https://www.google.com/maps?q=${lat},${long}`))
        callback()
    })
})

server.listen(port, () => {
    console.log('Server running at port ' + port);
})