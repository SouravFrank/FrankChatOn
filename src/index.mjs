import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {Filter} from 'bad-words';
import { generateMessage, generateLocationMessage } from './utils/msg.mjs';
import { addUser, removeUser, getUser, getUsersInRoom } from './utils/users.mjs';
import cors from 'cors';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app and create HTTP server
const app = express();
app.use(cors({ origin: '*' }));
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server);

// Set up static file serving
const publicDirPath = path.join(__dirname, '../public');
app.use(express.static(publicDirPath));

// Set port for the server
const port = process.env.PORT || 8080;

// Create a single instance of the profanity filter
const filter = new Filter();

// Handle new socket connections
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Handle user joining a room
    socket.on('join', async ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });
        
        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        // Welcome the new user
        socket.emit('message', generateMessage('system', `Welcome, ${user.username}!`));
        
        // Notify others in the room
        socket.to(user.room).emit('message', generateMessage('system', `${user.username} has joined!`));

        // Send updated room data
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    // Handle sending messages
    socket.on('sendMessage', (text, callback) => {
        const user = getUser(socket.id);

        if (!user) {
            return callback('User not found');
        }

        if (!text) {
            return callback('Please enter a message');
        }

        if (filter.isProfane(text)) {
            return callback('Profanity not allowed!');
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, text));
        callback('Delivered!');
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('system', `${user.username} has left`));
            
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });

    // Handle location sharing
    socket.on('getLocation', ({ lat, long }, callback) => {
        const user = getUser(socket.id);

        if (!user) {
            return callback('User not found');
        }

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${lat},${long}`));
        callback();
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at port ${port}`);
});