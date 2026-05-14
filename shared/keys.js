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

// keyDefs: [{ name: 'SOME_KEY', hint: 'where to get it' }]
// Returns an object of resolved key-value pairs (skipped keys are absent).
async function resolveKeys(keyDefs, { yes = false } = {}) {
  const stored = readVibeSetup();
  const resolved = {};
  const missing = [];
  let anyFromFile = false;

  for (const def of keyDefs) {
    const value = process.env[def.name] || stored[def.name];
    if (value) {
      resolved[def.name] = value;
      if (!process.env[def.name]) anyFromFile = true;
    } else {
      missing.push(def);
    }
  }

  if (anyFromFile) console.log('[INFO] API keys loaded from ~/.vibe-setup');

  if (missing.length === 0) return resolved;

  const { default: inquirer } = await import('inquirer');
  console.log('\nSome API keys are missing. Enter them now or press Enter to skip.\n');

  const prompted = {};
  for (const { name, hint } of missing) {
    const { value } = await inquirer.prompt([{
      type: 'password',
      name: 'value',
      message: `${name}${hint ? ` (${hint})` : ''}:`,
      mask: '*',
    }]);
    if (value) prompted[name] = value;
  }

  if (Object.keys(prompted).length > 0) {
    let save = yes;
    if (!yes) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Save these keys to ~/.vibe-setup for future runs?',
        default: true,
      }]);
      save = confirm;
    }
    if (save) writeVibeSetup(prompted);
  }

  return { ...resolved, ...prompted };
}

module.exports = { resolveKeys };
