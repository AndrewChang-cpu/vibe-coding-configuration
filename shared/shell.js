const fs = require('fs');
const os = require('os');
const path = require('path');
const { promptInput, promptSelect } = require('./prompts');
const { readVibeSetup, writeVibeSetup } = require('./keys');

function upsertShellLine(rcFile, pattern, line) {
  const content = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf8') : '';
  const updated = pattern.test(content)
    ? content.replace(pattern, line)
    : content.replace(/\n*$/, '\n') + `${line}\n`;
  fs.writeFileSync(rcFile, updated, 'utf8');
  console.log(`[UPDATED] ${rcFile} → ${line}`);
}

async function resolveRcFile({ reconfigure = false } = {}) {
  const stored = readVibeSetup();
  if (stored.RC_FILE && !reconfigure) return stored.RC_FILE;

  const choices = [path.join(os.homedir(), '.bashrc'), path.join(os.homedir(), '.zshrc')];
  const rcFile = await promptSelect('Which shell config file should vibe-setup write to?', choices, 0);
  writeVibeSetup({ RC_FILE: rcFile });
  return rcFile;
}

// Prompts for a value (storing it in ~/.vibe-setup), then upserts a line derived
// from that value into the resolved shell rc file.
async function configureShellValue({ key, promptMessage, linePattern, lineBuilder, reconfigure = false }) {
  const stored = readVibeSetup();
  let value = stored[key] || process.env[key];
  if (!value || reconfigure) {
    value = await promptInput(promptMessage, stored[key] || value || '');
  }
  if (!value) return;

  writeVibeSetup({ [key]: value });
  const rcFile = await resolveRcFile({ reconfigure });
  upsertShellLine(rcFile, linePattern, lineBuilder(value));
}

module.exports = { configureShellValue };
