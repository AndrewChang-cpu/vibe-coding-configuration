const fs = require('fs');
const path = require('path');
const { readTemplate, writeFile, writeFileIfAbsent, exec } = require('../shared/utils');

function setup(cwd) {
  console.log('[INFO] Configuring Codex...');

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(vibe, { recursive: true });

  writeFileIfAbsent(path.join(vibe, 'lessons.md'), readTemplate('lessons.md'));

  // --- AGENTS.md ---
  writeFile(path.join(cwd, 'AGENTS.md'), readTemplate('global-claude.md'));

  // --- .codex/config.json ---
  const codexDir = path.join(cwd, '.codex');
  fs.mkdirSync(codexDir, { recursive: true });
  const codexConfig = {
    model: 'codex-1',
    instructions: 'See AGENTS.md for full agent instructions.',
    context: ['.vibe/lessons.md'],
  };
  writeFileIfAbsent(path.join(codexDir, 'config.json'), JSON.stringify(codexConfig, null, 2));

  console.log('[SUCCESS] Codex configured.');
}

module.exports = { setup };
