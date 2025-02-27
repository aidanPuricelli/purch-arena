const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const svgFolder = '../src/assets/symbols';
const outputFolder = '../src/assets/symbols-png';

fs.readdirSync(svgFolder).forEach(file => {
  if (file.endsWith('.svg')) {
    const filePath = path.join(svgFolder, file);
    const outputFileName = file.replace('.svg', '.png');
    const outputPath = path.join(outputFolder, outputFileName);

    sharp(filePath)
      .png()
      .toFile(outputPath)
      .then(() => console.log(`Converted: ${file} -> ${outputFileName}`))
      .catch(err => console.error(err));
  }
});
