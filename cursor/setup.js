const fs = require('fs');
const path = require('path');
const { readTemplate, writeFile, exec } = require('../shared/utils');

function setup(cwd) {
  console.log('[INFO] Configuring Cursor...');

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(vibe, { recursive: true });

  // --- .cursor/mcp.json ---
  const isWindows = process.platform === 'win32';
  const cursorDir = path.join(cwd, '.cursor');
  const rulesDir = path.join(cursorDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  const mcpJsonPath = path.join(cursorDir, 'mcp.json');
  if (!fs.existsSync(mcpJsonPath)) {
    const cmd = isWindows ? 'cmd' : 'npx';
    const makeArgs = (pkg, extra = []) =>
      isWindows
        ? ['/c', 'npx', '-y', pkg, ...extra]
        : ['-y', pkg, ...extra];

    const mcpJson = {
      mcpServers: {
        postgres: { command: cmd, args: makeArgs('@modelcontextprotocol/server-postgres', ['postgresql://localhost:5432/postgres']) },
        github: { command: cmd, args: makeArgs('@modelcontextprotocol/server-github') },
        'sequential-thinking': { command: cmd, args: makeArgs('@modelcontextprotocol/server-sequential-thinking') },
        puppeteer: { command: cmd, args: makeArgs('@modelcontextprotocol/server-puppeteer') },
        context7: { command: cmd, args: makeArgs('@upstash/context7-mcp') },
        tavily: { command: cmd, args: makeArgs('tavily-mcp') },
      },
    };
    writeFile(mcpJsonPath, JSON.stringify(mcpJson, null, 2));
  }

  // --- Cursor rules ---
  writeFile(path.join(rulesDir, '000-main-rules.mdc'), readTemplate('global-claude.md'));

  console.log('[SUCCESS] Cursor configured.');
}

module.exports = { setup };
