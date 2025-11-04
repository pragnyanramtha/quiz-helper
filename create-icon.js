// Simple script to create a basic icon for the app
// This creates a 256x256 PNG that can be converted to ICO

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="256" height="256" rx="32" fill="#10b981"/>
  
  <!-- AI Symbol -->
  <circle cx="128" cy="100" r="40" fill="white" opacity="0.9"/>
  <circle cx="128" cy="100" r="25" fill="#10b981"/>
  
  <!-- Code brackets -->
  <path d="M 70 140 L 50 160 L 70 180" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 186 140 L 206 160 L 186 180" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Center line -->
  <line x1="110" y1="140" x2="146" y2="180" stroke="white" stroke-width="8" stroke-linecap="round"/>
</svg>`;

// Save SVG
const svgPath = path.join(__dirname, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('Created icon.svg');
console.log('\nTo create proper icons, you can:');
console.log('1. Use an online tool like https://cloudconvert.com/svg-to-ico');
console.log('2. Or use ImageMagick: magick convert icon.svg -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico');
console.log('3. Or use an online icon generator like https://www.icoconverter.com/');
