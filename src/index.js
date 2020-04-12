const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const path = require('path')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/msg')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirPath = path.join( __dirname, '../public')
const port = process.env.PORT || 8080

app.use(express.static(publicDirPath))


io.on('connection', (socket) => {
    console.log('io on!');
    
    socket.on('join', ( { username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        
        if(error) {
            return callback(error)
        }

        socket.join(room)

        socket.emit('message', generateMessage('system', `Welcome! ${user.username}`))
        socket.broadcast.to(room).emit('message', generateMessage('system', `${username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
    })

    socket.on('sendMessage', (text, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(!text) {
            return callback('Please enter a message')
        }

        if(filter.isProfane(text)) {
            return callback('Profanity not allowed!')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, text))
        callback('Delivered!')
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id) 

        if(user) {
            io.emit('message', generateMessage('system', `${user.username} has left`))
                
            io.to(user.room).emit('roomData', {
                
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
    socket.on('getLocation', ({lat,long}, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${lat},${long}`))
        callback()
    })
})

server.listen(port, () => {
    console.log('Server running at port ' + port);
})