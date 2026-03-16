// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors()); // Allow cross-origin requests

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from any origin
        methods: ["GET", "POST"]
    }
});

// This runs when any dashboard connects to the server
io.on('connection', (socket) => {
    console.log('✅ A user connected:', socket.id);

    // [NEW] 1. Allow Loco Pilots to join a specific "room" for their Train ID
    socket.on('joinTrainRoom', (trainId) => {
        socket.join(trainId);
        console.log(`🚂 Socket ${socket.id} joined room: ${trainId}`);
    });

    // Listen for the master simulation state
    socket.on('broadcastState', (state) => {
        
        // A. Keep sending the FULL list to Station Masters (They need the map)
        io.emit('stateUpdate', state); 

        // [NEW] B. Send individual updates ONLY to the specific train rooms
        // This is the "Scaling" magic. 
        if (Array.isArray(state)) {
            state.forEach(train => {
                // Send this specific train object ONLY to the room named "12951", "22440", etc.
                io.to(train.id).emit('trainSpecificUpdate', train);
            });
        }
    });

    // Listen for a specific message to a pilot and broadcast it
    // [OPTIMIZED] We can send this directly to the room now too
    socket.on('controlMessageToPilot', (messageData) => {
        // Send to specific train room instead of everyone
        io.to(messageData.trainId).emit('pilotMessage', messageData);
    });

    // Listen for an emergency stop and broadcast it (Global alert is fine here)
    socket.on('emergencyStop', (alertData) => {
        io.emit('emergencyAlert', alertData);
    });
    
    // Listen for a resume request and broadcast it
    socket.on('resumeRequest', (requestData) => {
        io.emit('resumeRequestAlert', requestData);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
