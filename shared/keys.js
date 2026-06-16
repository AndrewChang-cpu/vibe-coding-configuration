const fs = require('fs');
const os = require('os');
const path = require('path');
const VIBE_SETUP_PATH = path.join(os.homedir(), '.vibe-setup');

function readVibeSetup() {
  if (!fs.existsSync(VIBE_SETUP_PATH)) return {};
  const result = {};
  for (const line of fs.readFileSync(VIBE_SETUP_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

function writeVibeSetup(newKeys) {
  const merged = { ...readVibeSetup(), ...newKeys };
  const content = Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(VIBE_SETUP_PATH, content, 'utf8');
  console.log(`[INFO] Keys saved to ~/.vibe-setup`);
}

module.exports = { readVibeSetup, writeVibeSetup };
