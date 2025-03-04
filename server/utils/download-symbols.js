const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SYMBOLS_DIR = path.join(__dirname, '../src/assets/symbols');
const SCRYFALL_API = 'https://api.scryfall.com/symbology';

// Ensure the folder exists
if (!fs.existsSync(SYMBOLS_DIR)) {
  fs.mkdirSync(SYMBOLS_DIR, { recursive: true });
}

// Fetch symbols from Scryfall API
axios.get(SCRYFALL_API)
  .then(response => {
    const symbols = response.data.data;
    
    symbols.forEach(async (symbol) => {
      try {
        const symbolUrl = symbol.svg_uri;
        let fileName = symbol.symbol.replace(/[{}]/g, '').replace(/\//g, '-'); // Replace invalid characters
        const filePath = path.join(SYMBOLS_DIR, `${fileName}.svg`);

        // Download each SVG file
        const res = await axios.get(symbolUrl, { responseType: 'stream' });

        const stream = fs.createWriteStream(filePath);
        res.data.pipe(stream);

        stream.on('finish', () => console.log(`Downloaded: ${filePath}`));
        stream.on('error', err => console.error(`Stream error on ${filePath}:`, err));

      } catch (err) {
        console.error(`Failed to download ${symbol.svg_uri}:`, err);
      }
    });
  })
  .catch(err => console.error('Error fetching symbols:', err));
