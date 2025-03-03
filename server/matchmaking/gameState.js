const express = require('express');
const router = express.Router();

const gameStates = {}; // Stores game state per room

// 🔄 Sync player-specific game state
router.post('/sync-state', (req, res) => {
    const { roomId, playerId, playCards } = req.body;

    if (!gameStates[roomId]) {
        gameStates[roomId] = { players: {} };
    }

    if (!gameStates[roomId].players[playerId]) {
        gameStates[roomId].players[playerId] = { playCards: [] };
    }

    gameStates[roomId].players[playerId].playCards = playCards;


    res.json({ message: 'Game state updated' });
});


router.get('/game-state/:roomId/:playerId', (req, res) => {
    const { roomId, playerId } = req.params;

    if (!gameStates[roomId]) {
        console.warn(`🚨 Room ${roomId} not found!`);
        return res.status(404).json({ message: "Room not found" });
    }

    if (!gameStates[roomId].players[playerId]) {
        console.warn(`🚨 Player ${playerId} not found in room ${roomId}!`);
        return res.status(404).json({ message: "Player not found in room" });
    }

    const opponentBoards = Object.keys(gameStates[roomId].players)
        .filter(opponent => opponent !== playerId)
        .map(opponent => ({
            playerId: opponent,
            playCards: gameStates[roomId].players[opponent].playCards || []
        }));

    console.log("📡 Opponent Boards Found:", opponentBoards);

    res.setHeader('Content-Type', 'application/json'); // Ensure JSON response
    res.json({ opponentBoards });
});



module.exports = router;
