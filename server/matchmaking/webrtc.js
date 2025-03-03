const express = require('express');
const { Server } = require('socket.io');

const router = express.Router();
const { io } = require('../server'); 

io.on('connection', (socket) => {
    console.log(`🔗 Player connected: ${socket.id}`);

    // When a player joins a room
    socket.on('join-room', ({ roomId, playerId }) => {
        socket.join(roomId);
        console.log(`👥 Player ${playerId} joined room ${roomId}`);
        socket.to(roomId).emit('player-joined', { playerId });
    });

    // When a player sends their updated game state
    socket.on('sync-game-state', ({ roomId, playerId, playCards }) => {

        // Send the updated state to all players *except the sender*
        socket.to(roomId).emit('update-game-state', { playerId, playCards });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`🔴 Player disconnected: ${socket.id}`);
    });
});


module.exports = router;
