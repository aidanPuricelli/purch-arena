const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const ngrok = require('ngrok');

let ngrokUrl = null; // store ngrok url globally

// Store active game rooms
const gameRooms = {};

router.post('/create-room', async (req, res) => {
    try {
        console.log("Received request to create room...");
        console.log("Environment variables in matchmaking:");
        console.log("NGROK_AUTH_TOKEN:", process.env.NGROK_AUTH_TOKEN ? '***' : 'not set');
        console.log("NODE_ENV:", process.env.NODE_ENV);

        if (!process.env.NGROK_AUTH_TOKEN) {
            throw new Error("NGROK_AUTH_TOKEN is not set in environment variables");
        }

        if (!ngrokUrl) {
            try {
                // Simplified ngrok configuration to match working command line version
                ngrokUrl = await ngrok.connect({
                    addr: 3001,
                    authtoken: process.env.NGROK_AUTH_TOKEN
                });
                console.log(`ngrok tunnel started successfully: ${ngrokUrl}`);
            } catch (ngrokError) {
                console.error("Detailed ngrok error:", ngrokError);
                throw new Error(`Failed to start ngrok tunnel: ${ngrokError.message}`);
            }
        }

        const roomId = uuidv4();
        gameRooms[roomId] = { players: [], gameState: {} };

        // Ensure correct URL format (force HTTPS)
        if (!ngrokUrl.startsWith("https://")) {
            ngrokUrl = ngrokUrl.replace("http://", "https://");
        }

        console.log(`Room ${roomId} created successfully.`);
        res.json({ roomId, serverUrl: ngrokUrl });
    } catch (error) {
        console.error("Error in create-room endpoint:", error);
        res.status(500).json({ 
            message: 'Failed to create room', 
            error: error.message,
            details: error.stack
        });
    }
});

// Join an existing room
router.post('/join-room', (req, res) => {
    const { roomId, playerId } = req.body;

    console.log(`📡 Player ${playerId} attempting to join room ${roomId}`);

    if (!playerId) {
        console.error("Received request with undefined playerId!");
        return res.status(400).json({ message: "Player ID is required." });
    }

    if (!gameRooms[roomId]) {
        return res.status(404).json({ message: "Room not found" });
    }

    if (!gameRooms[roomId].players.includes(playerId)) {
        gameRooms[roomId].players.push(playerId);
    }

    console.log(`Players in room ${roomId}:`, gameRooms[roomId].players);
    res.json({ message: "Joined room successfully", players: gameRooms[roomId].players });
});

// Get room details
router.get('/room/:roomId', (req, res) => {
    const { roomId } = req.params;

    if (!gameRooms[roomId]) {
        return res.status(404).json({ message: 'Room not found' });
    }

    res.json(gameRooms[roomId]);
});

module.exports = router;
