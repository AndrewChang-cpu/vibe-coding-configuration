const fs = require('fs');
const os = require('os');
const path = require('path');
const { readTemplate, writeFile } = require('../shared/utils');
const { promptConfirm } = require('../shared/prompts');
const { configureShellValue } = require('../shared/shell');

async function setup(cwd, { yes = false, reconfigure = false } = {}) {
  console.log('[INFO] Configuring Claude Code...');

  // --- ~/.claude/CLAUDE.md (global) ---
  const globalClaudeDir = path.join(os.homedir(), '.claude');
  fs.mkdirSync(globalClaudeDir, { recursive: true });
  const globalClaudePath = path.join(globalClaudeDir, 'CLAUDE.md');

  let writeGlobal = true;
  if (fs.existsSync(globalClaudePath) && !yes) {
    writeGlobal = await promptConfirm('~/.claude/CLAUDE.md already exists. Override with latest template?', false);
  }

  if (writeGlobal) writeFile(globalClaudePath, readTemplate('global-claude.md'));

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(path.join(vibe, 'skills'), { recursive: true });

  // --- general-plugin --plugin-dir alias ---
  await configureShellValue({
    key: 'GENERAL_PLUGIN_DIR',
    promptMessage: 'Absolute path to general-plugin directory for the claude --plugin-dir alias (Enter to keep current)',
    linePattern: /^alias claude=.*$/m,
    lineBuilder: (value) => `alias claude='claude --plugin-dir "${value}"'`,
    reconfigure,
  });

  // --- Agents ---
  const agentsSrc = path.join(__dirname, '..', 'general-plugin', 'agents');
  const agentsDest = path.join(globalClaudeDir, 'agents');
  fs.mkdirSync(agentsDest, { recursive: true });
  if (fs.existsSync(agentsSrc)) {
    for (const file of fs.readdirSync(agentsSrc)) {
      if (file.endsWith('.md')) {
        const dest = path.join(agentsDest, file);
        fs.copyFileSync(path.join(agentsSrc, file), dest);
        console.log(`[CREATED] ${dest}`);
      }
    }
  }

  // --- Workflows ---
  const workflowsSrc = path.join(__dirname, '..', '.claude', 'workflows');
  const workflowsDest = path.join(globalClaudeDir, 'workflows');
  fs.mkdirSync(workflowsDest, { recursive: true });
  if (fs.existsSync(workflowsSrc)) {
    for (const file of fs.readdirSync(workflowsSrc)) {
      if (file.endsWith('.js')) {
        const dest = path.join(workflowsDest, file);
        fs.copyFileSync(path.join(workflowsSrc, file), dest);
        console.log(`[CREATED] ${dest}`);
      }
    }
  }

  console.log('[SUCCESS] Claude Code configured.');
}

module.exports = { setup };
