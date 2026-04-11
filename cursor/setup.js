const fs = require('fs');
const path = require('path');
const { readTemplate, writeFile, writeFileIfAbsent, execSilent } = require('../shared/utils');

function setup(cwd) {
  console.log('[INFO] Configuring Cursor...');

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(path.join(vibe, 'skills'), { recursive: true });

  writeFileIfAbsent(path.join(vibe, 'project-context.md'), readTemplate('project-context.md'));
  writeFileIfAbsent(path.join(vibe, 'mcp-triggers.md'), readTemplate('mcp-triggers.md'));
  writeFileIfAbsent(path.join(vibe, 'lessons.md'), readTemplate('lessons.md'));

  const opsRules = readTemplate('operational-rules.md');

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
  fs.copyFileSync(path.join(vibe, 'project-context.md'), path.join(rulesDir, '000-main-rules.mdc'));
  console.log('[CREATED] .cursor/rules/000-main-rules.mdc');
  fs.copyFileSync(path.join(vibe, 'mcp-triggers.md'), path.join(rulesDir, '001-mcp-triggers.mdc'));
  console.log('[CREATED] .cursor/rules/001-mcp-triggers.mdc');

  const ops002 = `${opsRules}

---

## Lessons & Self-Correction
Read \`.vibe/lessons.md\` at the start of each session. After ANY user correction, immediately add the pattern to \`.vibe/lessons.md\`.
`;
  writeFile(path.join(rulesDir, '002-operational.mdc'), ops002);

  // --- Get Shit Done ---
  execSilent(`npx get-shit-done-cc@latest`);

  console.log('[SUCCESS] Cursor configured.');
}

module.exports = { setup };
