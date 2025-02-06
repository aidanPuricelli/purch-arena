const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const filePath = path.join(__dirname, 'decks.json');
const commandersFilePath = path.join(__dirname, 'commander.json');

// Load all decks
const loadDecks = () => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {}; // Return an empty object if file doesn't exist or is corrupted
  }
};

// Save all decks
const saveDecks = (decks) => {
  fs.writeFileSync(filePath, JSON.stringify(decks, null, 2));
};

// Load commanders
const loadCommanders = () => {
  try {
    const data = fs.readFileSync(commandersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {}; // Return empty if file is missing
  }
};

// Save commanders
const saveCommanders = (commanders) => {
  fs.writeFileSync(commandersFilePath, JSON.stringify(commanders, null, 2));
};

// GET all deck names
app.get('/api/decks', (req, res) => {
  const decks = loadDecks();
  res.json({ deckNames: Object.keys(decks) });
});

// GET a specific deck
app.get('/api/deck/:deckName', (req, res) => {
  const { deckName } = req.params;
  const decks = loadDecks();
  if (!decks[deckName]) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  res.json({ deck: decks[deckName] });
});

// GET commander for a specific deck
app.get('/api/deck/:deckName/commander', (req, res) => {
  const { deckName } = req.params;
  const commanders = loadCommanders();

  if (!commanders[deckName]) {
    return res.status(404).json({ message: 'No commander set for this deck' });
  }

  res.json({ commander: commanders[deckName] });
});

// POST - Set a commander for a specific deck
app.post('/api/deck/:deckName/commander', (req, res) => {
  const { deckName } = req.params;
  const { commander } = req.body;

  if (!commander) {
    return res.status(400).json({ message: 'Commander card required' });
  }

  const decks = loadDecks();
  if (!decks[deckName]) {
    return res.status(404).json({ message: 'Deck not found' });
  }

  const commanders = loadCommanders();
  commanders[deckName] = commander; // Set commander for this deck
  saveCommanders(commanders);

  res.json({ message: `Commander set for deck "${deckName}" successfully` });
});

// POST - Create a new deck
app.post('/api/deck', (req, res) => {
  const { deckName } = req.body;
  if (!deckName) return res.status(400).json({ message: 'Deck name required' });

  const decks = loadDecks();
  if (decks[deckName]) return res.status(400).json({ message: 'Deck already exists' });

  decks[deckName] = []; // Create empty deck
  saveDecks(decks);
  res.json({ message: `Deck "${deckName}" created successfully` });
});

// POST - Update a deck (add/remove cards)
app.post('/api/deck/:deckName', (req, res) => {
  const { deckName } = req.params;
  const { newCards = [], removedCards = [] } = req.body;

  const decks = loadDecks();
  if (!decks[deckName]) return res.status(404).json({ message: 'Deck not found' });

  let deck = decks[deckName];

  // Remove cards (remove one instance per card in removedCards)
  removedCards.forEach(removed => {
    const index = deck.findIndex(card => card.id === removed.id);
    if (index !== -1) deck.splice(index, 1);
  });

  // Add new cards
  deck = deck.concat(newCards);

  decks[deckName] = deck;
  saveDecks(decks);
  res.json({ message: `Deck "${deckName}" updated successfully` });
});

// DELETE - Remove a deck
app.delete('/api/deck/:deckName', (req, res) => {
  const { deckName } = req.params;
  const decks = loadDecks();
  const commanders = loadCommanders();

  if (!decks[deckName]) return res.status(404).json({ message: 'Deck not found' });

  delete decks[deckName]; // Delete deck
  delete commanders[deckName]; // Also delete the commander
  saveDecks(decks);
  saveCommanders(commanders);

  res.json({ message: `Deck "${deckName}" deleted successfully` });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
