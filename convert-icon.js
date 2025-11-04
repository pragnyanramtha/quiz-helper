const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if sharp is installed
try {
  require.resolve('sharp');
  console.log('Sharp is installed, using it for conversion...');
  convertWithSharp();
} catch (e) {
  console.log('Sharp not found. Installing sharp...');
  try {
    execSync('npm install sharp --no-save', { stdio: 'inherit' });
    convertWithSharp();
  } catch (err) {
    console.error('Failed to install sharp. Please install manually: npm install sharp');
    console.log('\nAlternatively, you can:');
    console.log('1. Open electron-icon.webp in an image editor');
    console.log('2. Export as PNG (256x256 or larger)');
    console.log('3. Use an online converter: https://convertio.co/webp-ico/');
    process.exit(1);
  }
}

async function convertWithSharp() {
  const sharp = require('sharp');
  
  const inputPath = path.join(__dirname, 'assets', 'icons', 'win', 'electron-icon.webp');
  const outputPngPath = path.join(__dirname, 'assets', 'icons', 'win', 'electron-icon.png');
  const outputIcoPath = path.join(__dirname, 'build', 'icon.ico');
  
  try {
    // Convert webp to png
    console.log('Converting electron-icon.webp to PNG...');
    await sharp(inputPath)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPngPath);
    
    console.log('✓ Created electron-icon.png');
    
    // For ICO, we need to create multiple sizes
    console.log('Creating ICO with multiple sizes...');
    const sizes = [256, 128, 96, 64, 48, 32, 16];
    const pngBuffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(inputPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
    }
    
    // Note: Sharp doesn't create ICO directly, so we'll just use the PNG
    // Copy the 256x256 PNG to build folder
    fs.copyFileSync(outputPngPath, path.join(__dirname, 'build', 'icon.png'));
    
    console.log('✓ Created icon.png in build folder');
    console.log('\n✓ Conversion complete!');
    console.log('\nNote: For proper ICO format with multiple sizes, use:');
    console.log('- Online tool: https://convertio.co/png-ico/');
    console.log('- Or ImageMagick: magick convert electron-icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico');
    
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}
