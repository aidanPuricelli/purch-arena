const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// GET endpoint to load the deck data from deck.json
app.get('/api/deck', (req, res) => {
  const filePath = path.join(__dirname, 'deck.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading deck file:', err);
      return res.status(500).json({ message: 'Failed to load deck' });
    }
    try {
      const deck = JSON.parse(data);
      res.json({ deck });
    } catch (error) {
      console.error('Error parsing deck JSON:', error);
      res.status(500).json({ message: 'Failed to parse deck data' });
    }
  });
});

// POST endpoint to update the deck data in deck.json
// POST endpoint to update the deck data in deck.json
app.post('/api/deck', (req, res) => {
  const newCards = req.body.newCards || [];
  const removedCards = req.body.removedCards || [];
  const filePath = path.join(__dirname, 'deck.json');

  // First, read the existing deck from the file
  fs.readFile(filePath, 'utf8', (err, data) => {
    let savedDeck = [];
    if (!err) {
      try {
        savedDeck = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing deck.json:', error);
      }
    }

    // Remove one instance per card in removedCards
    removedCards.forEach(removed => {
      const index = savedDeck.findIndex(card => card.id === removed.id);
      if (index !== -1) {
        savedDeck.splice(index, 1);
      }
    });

    // Add all new cards (allowing duplicates)
    savedDeck = savedDeck.concat(newCards);

    // Write the updated deck back to deck.json
    fs.writeFile(filePath, JSON.stringify(savedDeck, null, 2), (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return res.status(500).json({ message: 'Failed to save deck' });
      }
      res.json({ message: 'Deck saved successfully' });
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
