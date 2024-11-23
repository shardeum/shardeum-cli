
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dist', 'index.js');
const shebang = '#!/usr/bin/env node\n';

const originalContent = fs.readFileSync(filePath, 'utf8');

if (!originalContent.startsWith('#!/usr/bin/env node')) {
  fs.writeFileSync(filePath, shebang + originalContent, 'utf8');
  console.log('Shebang added to dist/index.js');
} else {
  console.log('Shebang already present in dist/index.js');
}