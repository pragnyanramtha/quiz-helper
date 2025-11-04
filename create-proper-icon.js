// Create a proper Windows icon from the modern style PNG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcon() {
  const inputPath = path.join(__dirname, 'assets', 'icons', 'win', 'modern style icon fo.png');
  const outputDir = path.join(__dirname, 'build');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Create 256x256 PNG for Windows
    console.log('Creating 256x256 icon...');
    await sharp(inputPath)
      .resize(256, 256, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .png()
      .toFile(path.join(outputDir, 'icon.png'));
    
    console.log('✓ Created build/icon.png (256x256)');
    
    // Also create for assets
    await sharp(inputPath)
      .resize(256, 256, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .png()
      .toFile(path.join(__dirname, 'assets', 'icons', 'win', 'icon-256.png'));
    
    console.log('✓ Created assets/icons/win/icon-256.png');
    
    console.log('\n✅ Icon files created successfully!');
    console.log('\nNext steps:');
    console.log('1. Convert icon-256.png to ICO format using:');
    console.log('   - Online: https://convertio.co/png-ico/');
    console.log('   - Or: https://www.icoconverter.com/');
    console.log('2. Save as build/icon.ico');
    console.log('3. Run: npm run package-win');
    
  } catch (error) {
    console.error('Error creating icon:', error);
    process.exit(1);
  }
}

createIcon();
