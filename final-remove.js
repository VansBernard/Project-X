#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\ASUS\\Documents\\Project X';
const filesToRemove = ['cleanup.js', 'final-cleanup.js'];

filesToRemove.forEach(file => {
  const filePath = path.join(rootPath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✓ Removed: ${file}`);
  }
});

console.log('✅ Final cleanup complete!');
