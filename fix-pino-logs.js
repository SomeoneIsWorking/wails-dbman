#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixPinoLogging(filePath) {
  console.log(`Fixing Pino logging in: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Fix pattern: logger.level('message', { object }) → logger.level({ object }, 'message')
  const patterns = [
    /logger\.(debug|info|warn|error)\s*\(\s*'([^']+)'\s*,\s*(\{[^}]*\})\s*\)/g,
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]+)"\s*,\s*(\{[^}]*\})\s*\)/g,
    /logger\.(debug|info|warn|error)\s*\(\s*`([^`]+)`\s*,\s*(\{[^}]*\})\s*\)/g
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, level, message, object) => {
      changes++;
      return `logger.${level}(${object}, '${message}')`;
    });
  });
  
  // Handle multi-line object patterns
  const multilinePattern = /logger\.(debug|info|warn|error)\s*\(\s*'([^']+)'\s*,\s*\{\s*\n([\s\S]*?)\n\s*\}\s*\)/g;
  content = content.replace(multilinePattern, (match, level, message, objectContent) => {
    changes++;
    return `logger.${level}({\n${objectContent}\n}, '${message}')`;
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  Fixed ${changes} Pino logging calls`);
  } else {
    console.log(`  No changes needed`);
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts')) {
      callback(filePath);
    }
  });
}

// Process all TypeScript files in the server directory
walkDir('./server', fixPinoLogging);

console.log('Pino logging fix completed!');
