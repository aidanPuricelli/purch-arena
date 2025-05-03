const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createCanvas, loadImage } = require('canvas');
const matchmakingRoutes = require('./matchmaking/matchmaking');
const gameStateRoutes = require('./matchmaking/gameState');
const cors = require('cors');

// Try to load .env file
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (error) {
    console.warn('Failed to load .env file:', error.message);
}

// Fallback: Set environment variables directly if not loaded from .env
if (!process.env.NGROK_AUTH_TOKEN) {
    process.env.NGROK_AUTH_TOKEN = '2tmXbJ0lLbYwFKxyNNIMuiZw1zA_656Lumt4P6iTNuWFRvNdu';
    process.env.NODE_ENV = 'test';
    console.log('Using fallback environment variables');
}

// Log environment variables for debugging
console.log('Environment variables loaded:');
console.log('NGROK_AUTH_TOKEN:', process.env.NGROK_AUTH_TOKEN ? '***' : 'not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', __dirname);
console.log('Env file path:', path.join(__dirname, '../.env'));

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());
app.use('/custom_images', express.static(path.join(__dirname, 'custom-cards/custom_images')));
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/game', gameStateRoutes);
// app.use((req, res, next) => {
//   console.log(`📡 Incoming request: ${req.method} ${req.originalUrl}`);
//   console.log(`🔍 Request Body:`, req.body);
//   next();
// });

const server = http.createServer(app);  // Create HTTP server
const io = new Server(server, {  // Attach io to server
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
  }
});

// Export both `io` and `server`
module.exports = { io, server };

const webrtcRoutes = require('./matchmaking/webrtc'); // require after exports...
app.use('/api/webrtc', webrtcRoutes);


const filePath = path.join(__dirname, 'deck/decks.json');
const commandersFilePath = path.join(__dirname, 'deck/commander.json');
const customCardsPath = path.join(__dirname, 'custom-cards/custom_cards.json');

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

// upload commander and deck json files
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

// Download a single deck
app.get('/api/deck/:deckName/download', (req, res) => {
  const { deckName } = req.params;
  const decks = loadDecks();

  if (!decks[deckName]) {
    return res.status(404).json({ message: 'Deck not found' });
  }

  const deckData = JSON.stringify(decks[deckName], null, 2);
  const fileName = `${deckName}.json`;

  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader('Content-Type', 'application/json');
  res.send(deckData);
});

// Import a single deck with data cleanup for old formats
app.post('/api/deck/:deckName/import', upload.single('file'), (req, res) => {
  const { deckName } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    let deckData = JSON.parse(req.file.buffer.toString());

    // Clean deck data to ensure only the necessary fields
    const cleanedDeck = deckData.map(card => {
      return {
        name: card.name,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        // Check old and new formats for image_uri
        image_uri: card.image_uri || (card.image_uris?.normal || null)
      };
    });

    const decks = loadDecks();
    decks[deckName] = cleanedDeck;
    saveDecks(decks);

    res.json({ message: `Deck "${deckName}" imported successfully.` });
  } catch (error) {
    console.error('Error importing deck:', error);
    res.status(500).json({ message: 'Invalid deck file.' });
  }
});



// Import deck from text file using Scryfall API
app.post('/api/deck/:deckName/import-text', upload.single('file'), async (req, res) => {
  const { deckName } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const textContent = req.file.buffer.toString();
  const lines = textContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('SIDEBOARD'));

  const deck = [];

  // Fetch card details from Scryfall API with only the necessary fields
  const fetchCardData = async (cardName) => {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
      if (!response.ok) {
        console.warn(`Failed to fetch card: ${cardName}`);
        return null;
      }
      const card = await response.json();
      return {
        name: card.name,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        image_uri: card.image_uris?.normal || null,
      };
    } catch (error) {
      console.error(`Error fetching card "${cardName}":`, error);
      return null;
    }
  };


  // Process each line
  for (const line of lines) {
    // Check for the original format
    const oldFormatMatch = line.match(/^(\d+)x (.+) \((\w+)\) (\S+) \[(.+)\]$/);
    const newFormatMatch = line.match(/^(\d+)\s+(.+)$/);

    if (oldFormatMatch) {
      // Original format
      const [, quantity, name, set, collectorNumber, category] = oldFormatMatch;
      const card = await fetchCardData(name);
      if (card) {
        for (let i = 0; i < quantity; i++) {
          deck.push({ ...card, category });
        }
      }
    } else if (newFormatMatch) {
      // New format
      const [, quantity, name] = newFormatMatch;
      const card = await fetchCardData(name);
      if (card) {
        for (let i = 0; i < quantity; i++) {
          deck.push({ ...card, category: 'Uncategorized' });
        }
      }
    }
  }

  if (deck.length === 0) {
    return res.status(400).json({ message: 'No valid cards found in the file.' });
  }

  const decks = loadDecks();
  decks[deckName] = deck;
  saveDecks(decks);

  res.json({ message: `Deck "${deckName}" imported from text file successfully.` });
});

// Save a custom game state
app.post('/api/save-game', (req, res) => {
  const { gameName, gameState } = req.body;

  // Validate inputs
  if (!gameName || !gameState || typeof gameName !== 'string') {
    return res.status(400).json({ message: 'Valid game name and game state are required.' });
  }

  // Sanitize file name
  const sanitizedGameName = gameName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const savePath = path.join(__dirname, `${sanitizedGameName}.json`);

  try {
    // Write game state to file
    fs.writeFileSync(savePath, JSON.stringify(gameState, null, 2));
    console.log(`Game state saved: ${sanitizedGameName}.json`);
    res.json({ message: `Game state saved as ${sanitizedGameName}.json` });
  } catch (error) {
    console.error('Error saving game state:', error);
    res.status(500).json({ message: 'Failed to save game state.' });
  }
});

// Endpoint to get a list of saved game states
app.get('/api/saved-states', (req, res) => {
  const dir = __dirname;

  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ message: 'Failed to retrieve saved states.' });
    }

    // Filter only JSON files excluding decks.json, commander.json, and settings.json
    const savedStates = files.filter(file => 
      file.endsWith('.json') && 
      !['decks.json', 'commander.json', 'settings.json', 'custom_cards.json'].includes(file)
    );

    res.json({ savedStates });
  });
});

// Load a saved game state
app.get('/api/load-game/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Sanitize file name to prevent path traversal
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '');
  const filePath = path.join(__dirname, sanitizedFileName);

  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Game state not found.' });
  }

  // Read and send the game state
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const gameState = JSON.parse(data);
    res.json(gameState);
  } catch (error) {
    console.error('Error loading game state:', error);
    res.status(500).json({ message: 'Failed to load game state.' });
  }
});

// Save settings to settings.json
app.post('/api/save-settings', (req, res) => {
  const { cardWidth, playOptionsFontSize } = req.body;
  const settingsPath = path.join(__dirname, 'user-config/settings.json');

  // Validate input
  if (typeof cardWidth !== 'number' || typeof playOptionsFontSize !== 'number') {
    return res.status(400).json({ message: 'Invalid settings data.' });
  }

  // Construct settings object
  const settings = { cardWidth, playOptionsFontSize };

  // Write to settings.json
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    res.json({ message: 'Card width and font size saved.' });
  } catch (error) {
    console.error('Failed to save settings:', error);
    res.status(500).json({ message: 'Failed to save settings.' });
  }
});

// Load settings from settings.json
app.get('/api/load-settings', (req, res) => {
  const settingsPath = path.join(__dirname, 'user-config/settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return res.status(404).json({ message: 'Settings file not found.' });
    }

    const settingsData = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsData);
    res.json(settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
    res.status(500).json({ message: 'Failed to load settings.' });
  }
});

// Endpoint to delete a saved game state
app.delete('/api/delete-game/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Sanitize file name to prevent path traversal
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '');
  const filePath = path.join(__dirname, `${sanitizedFileName}.json`);

  // Prevent deletion of protected files
  const protectedFiles = ['decks.json', 'commander.json', 'settings.json'];
  if (protectedFiles.includes(`${sanitizedFileName}.json`)) {
    return res.status(403).json({ message: 'Cannot delete protected file.' });
  }

  // Delete the file if it exists
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      res.json({ message: `File "${sanitizedFileName}.json" deleted successfully.` });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file.' });
    }
  } else {
    res.status(404).json({ message: 'File not found.' });
  }
});


// get symbols
app.get('/api/symbols', async (req, res) => {
  try {
    const response = await fetch('https://api.scryfall.com/symbology');
    const data = await response.json();

    if (!data.data) {
      return res.status(500).json({ message: 'Failed to fetch symbols' });
    }

    // Extract only the symbol image URLs
    const symbols = data.data.map(symbol => symbol.svg_uri);

    res.json({ symbols });
  } catch (error) {
    console.error('Error fetching symbols:', error);
    res.status(500).json({ message: 'Error fetching symbols' });
  }
});

const loadCustomCards = () => {
  try {
    const data = fs.readFileSync(customCardsPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveCustomCards = (cards) => {
  fs.writeFileSync(customCardsPath, JSON.stringify(cards, null, 2));
};

app.post('/api/save-custom-card', async (req, res) => {
  const { name, image } = req.body;

  if (!name || !image) {
    return res.status(400).json({ message: 'Invalid card data' });
  }

  const imageBuffer = Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64');
  const fileName = `${name.replace(/\s+/g, '_')}.png`;
  const filePath = path.join(__dirname, '../src/assets/custom_images', fileName);

  fs.writeFileSync(filePath, imageBuffer);

  const customCards = loadCustomCards();
  customCards.push({ name, image_uri: `assets/custom_images/${fileName}` });
  saveCustomCards(customCards);

  res.json({ message: 'Custom card saved successfully', image_uri: `../src/assets/custom_images/${fileName}` });
});

// GET custom cards
app.get('/api/custom-cards', (req, res) => {
  const customCards = loadCustomCards();
  res.json(customCards);
});


// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
