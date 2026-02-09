// Simple icon generator using canvas
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Check if we have canvas support
let createCanvas;
try {
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log('Canvas not installed. Creating placeholder icons...');
  console.log('Run: npm install canvas');
  console.log('Then run: node generate-icons.js');

  // Create simple 1x1 purple pixel PNGs as placeholders
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = path.join(__dirname, 'public', 'icons');

  // Simple 1x1 purple PNG (base64)
  const purplePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIA5aQYAAAASUVORK5CYII=', 'base64');

  sizes.forEach(size => {
    const filename = `icon-${size}x${size}.png`;
    fs.writeFileSync(path.join(iconsDir, filename), purplePixel);
    console.log(`Created placeholder: ${filename}`);
  });

  console.log('\nPlaceholder icons created. Replace with proper icons for production.');
  process.exit(0);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Purple background
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(0, 0, size, size);

  // White question mark
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Created: ${filename}`);
});

console.log('Icons generated successfully!');
