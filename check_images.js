const fs = require('fs');
const { promisify } = require('util');
const path = require('path');

async function checkImage(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    // Simple PNG dimension check for the first few bytes
    if (data[0] === 0x89 && data[1] === 0x50) {
      const width = data.readUInt32BE(16);
      const height = data.readUInt32BE(20);
      console.log(`Image: ${path.basename(filePath)} | Width: ${width} | Height: ${height}`);
    } else {
      console.log(`File ${path.basename(filePath)} is not a valid PNG.`);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

const assets = [
  'd:/VELURA/velura/assets/icon.png',
  'd:/VELURA/velura/assets/splash.png',
  'd:/VELURA/velura/assets/adaptive-icon.png'
];

assets.forEach(checkImage);
