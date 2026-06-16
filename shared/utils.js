const fs = require('fs');
const path = require('path');

function readTemplate(name) {
  return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf8');
}

function writeFile(filePath, content, label) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[CREATED] ${filePath}`);
}

module.exports = { readTemplate, writeFile };
