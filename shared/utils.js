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

function writeFileIfAbsent(filePath, content) {
  if (fs.existsSync(filePath)) return;
  writeFile(filePath, content);
}

function execSilent(cmd) {
  const { execSync } = require('child_process');
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (_) {}
}

module.exports = { readTemplate, writeFile, writeFileIfAbsent, execSilent };
