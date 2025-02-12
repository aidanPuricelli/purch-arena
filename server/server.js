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
    return {};
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
    return {};
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
  commanders[deckName] = commander;
  saveCommanders(commanders);

  res.json({ message: `Commander set for deck "${deckName}" successfully` });
});

// Create a new deck
app.post('/api/deck', (req, res) => {
  const { deckName } = req.body;
  if (!deckName) return res.status(400).json({ message: 'Deck name required' });

  const decks = loadDecks();
  if (decks[deckName]) return res.status(400).json({ message: 'Deck already exists' });

  decks[deckName] = []; // Create empty deck
  saveDecks(decks);
  res.json({ message: `Deck "${deckName}" created successfully` });
});

// Update a deck (add/remove cards)
app.post('/api/deck/:deckName', (req, res) => {
  const { deckName } = req.params;
  const { newCards = [], removedCards = [] } = req.body;

  const decks = loadDecks();
  if (!decks[deckName]) return res.status(404).json({ message: 'Deck not found' });

  let deck = decks[deckName];

  removedCards.forEach(removed => {
    const index = deck.findIndex(card => card.id === removed.id);
    if (index !== -1) deck.splice(index, 1);
  });

  deck = deck.concat(newCards);

  decks[deckName] = deck;
  saveDecks(decks);
  res.json({ message: `Deck "${deckName}" updated successfully` });
});

// DELETE 
app.delete('/api/deck/:deckName', (req, res) => {
  const { deckName } = req.params;
  const decks = loadDecks();
  const commanders = loadCommanders();

  if (!decks[deckName]) return res.status(404).json({ message: 'Deck not found' });

  delete decks[deckName];
  delete commanders[deckName];
  saveDecks(decks);
  saveCommanders(commanders);

  res.json({ message: `Deck "${deckName}" deleted successfully` });
});

// download json
app.get('/api/download/:fileName', (req, res) => {
  const { fileName } = req.params;
  const allowedFiles = ['decks.json', 'commander.json'];
  
  if (!allowedFiles.includes(fileName)) {
    return res.status(400).json({ message: 'Invalid file request' });
  }

  const filePath = path.join(__dirname, fileName);
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({ message: 'Error downloading file' });
    }
  });
});

// use multer for uploads
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const allowedFiles = ['decks.json', 'commander.json'];
  const uploadedFileName = req.file.originalname;

  if (!allowedFiles.includes(uploadedFileName)) {
    return res.status(400).json({ message: 'Invalid file type' });
  }

  const destinationPath = path.join(__dirname, uploadedFileName);

  if (fs.existsSync(destinationPath)) {
    fs.unlinkSync(destinationPath);
  }

  fs.writeFile(destinationPath, req.file.buffer, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return res.status(500).json({ message: 'Error saving file' });
    }
    res.json({ message: `${uploadedFileName} updated successfully` });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
