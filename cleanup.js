#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\ASUS\\Documents\\Project X';

// Files to delete from root
const filesToDelete = [
  'ARCHITECTURE.md',
  'DEPLOYMENT.md',
  'DEPLOY_RENDER.md',
  'MIGRATION_GUIDE.md',
  'SCHEMA_INTEGRATION_GUIDE.md',
  'SECRET_ROTATION.md',
  'cleanup-project.ps1'
];

// Files to move
const filesToMove = {
  'render.yaml': 'docs/render.yaml'
};

console.log('🧹 Cleaning up project structure...\n');

// Delete files
filesToDelete.forEach(file => {
  const filePath = path.join(rootPath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✓ Deleted: ${file}`);
  }
});

// Move files
Object.entries(filesToMove).forEach(([src, dest]) => {
  const srcPath = path.join(rootPath, src);
  const destPath = path.join(rootPath, dest);
  
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`✓ Moved: ${src} → ${dest}`);
  }
});

console.log('\n✅ Cleanup complete!');
console.log('\n📁 Final Structure:');
console.log('  ✓ backend/        - Node.js API Server');
console.log('  ✓ web/            - Payment Web Interface');
console.log('  ✓ laptop-client/  - C# Windows Desktop App');
console.log('  ✓ docs/           - Documentation & Deployment Configs');
console.log('  ✓ .gitignore      - Git configuration');
console.log('  ✓ README.md       - Project overview');
