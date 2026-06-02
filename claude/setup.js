const fs = require('fs');
const os = require('os');
const path = require('path');
const { readTemplate, writeFile, exec, execOptional } = require('../shared/utils');
const { resolveKeys, readVibeSetup, writeVibeSetup } = require('../shared/keys');

async function setup(cwd, { yes = false, reconfigure = false } = {}) {
  console.log('[INFO] Configuring Claude Code...');

  // --- ~/.claude/CLAUDE.md (global) ---
  const globalClaudeDir = path.join(os.homedir(), '.claude');
  fs.mkdirSync(globalClaudeDir, { recursive: true });
  const globalClaudePath = path.join(globalClaudeDir, 'CLAUDE.md');

  let writeGlobal = true;
  if (fs.existsSync(globalClaudePath) && !yes) {
    const { default: inquirer } = await import('inquirer');
    const { override } = await inquirer.prompt([{
      type: 'confirm',
      name: 'override',
      message: '~/.claude/CLAUDE.md already exists. Override with latest template?',
      default: false,
    }]);
    writeGlobal = override;
  }

  if (writeGlobal) writeFile(globalClaudePath, readTemplate('global-claude.md'));

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(path.join(vibe, 'skills'), { recursive: true });

  // --- API keys ---
  const keys = await resolveKeys([
    { name: 'GITHUB_PERSONAL_ACCESS_TOKEN', hint: 'github.com/settings/tokens' },
    { name: 'CONTEXT7_API_KEY',             hint: 'context7.com' },
    { name: 'TAVILY_API_KEY',               hint: 'tavily.com' },
  ], { yes, reconfigure });

  const githubToken  = keys.GITHUB_PERSONAL_ACCESS_TOKEN || '';
  const context7Key  = keys.CONTEXT7_API_KEY || '';
  const tavilyKey    = keys.TAVILY_API_KEY || '';

  // --- MCP servers ---
  const isWindows = process.platform === 'win32';
  const npx = isWindows ? 'npx.cmd' : 'npx';

  const mcpServers = ['postgres', 'github', 'sequential-thinking', 'puppeteer', 'context7', 'tavily', 'qmd'];
  for (const s of mcpServers) execOptional(`claude mcp remove ${s}`);

  exec(`claude mcp add --transport stdio postgres -- ${npx} -y @modelcontextprotocol/server-postgres postgresql://localhost:5432/postgres`);
  exec(`claude mcp add --transport stdio github -e GITHUB_PERSONAL_ACCESS_TOKEN=${githubToken} -- ${npx} -y @modelcontextprotocol/server-github`);
  exec(`claude mcp add --transport stdio sequential-thinking -- ${npx} -y @modelcontextprotocol/server-sequential-thinking`);
  exec(`claude mcp add --transport stdio puppeteer -- ${npx} -y @modelcontextprotocol/server-puppeteer`);
  exec(`claude mcp add --scope user --transport stdio context7 -- ${npx} -y @upstash/context7-mcp --api-key ${context7Key}`);
  exec(`claude mcp add --transport stdio tavily -e TAVILY_API_KEY=${tavilyKey} -- ${npx} -y tavily-mcp`);
  exec(`claude mcp add --scope user --transport stdio qmd -- qmd mcp`);

  // --- Plugin ---
  exec(`claude plugin marketplace add https://github.com/AndrewChang-cpu/vibe-coding-configuration`);
  exec(`claude plugin install general-plugin@vibe-coding`);
  exec(`claude plugin update general-plugin@vibe-coding`);
  exec(`claude plugin install obsidian-plugin@vibe-coding`);
  exec(`claude plugin update obsidian-plugin@vibe-coding`);
  exec(`claude plugin update frontend-design@claude-plugins-official`);

  // --- Obsidian vault path ---
  const storedVault = readVibeSetup().OBSIDIAN_VAULT || process.env.OBSIDIAN_VAULT;
  let vault = storedVault;
  if (!vault || reconfigure) {
    const { default: inquirer } = await import('inquirer');
    const { vaultPath } = await inquirer.prompt([{
      type: 'input',
      name: 'vaultPath',
      message: 'Absolute path to your Obsidian vault (Enter to keep current):',
      default: storedVault || '',
    }]);
    vault = vaultPath.trim() || storedVault || '';
  }
  if (vault) {
    writeVibeSetup({ OBSIDIAN_VAULT: vault });
    const zshrc = path.join(os.homedir(), '.zshrc');
    const zshrcContent = fs.existsSync(zshrc) ? fs.readFileSync(zshrc, 'utf8') : '';
    if (zshrcContent.includes('OBSIDIAN_VAULT')) {
      const updated = zshrcContent.replace(/export OBSIDIAN_VAULT=.*$/m, `export OBSIDIAN_VAULT="${vault}"`);
      fs.writeFileSync(zshrc, updated, 'utf8');
    } else {
      fs.appendFileSync(zshrc, `\nexport OBSIDIAN_VAULT="${vault}"\n`, 'utf8');
    }
    console.log(`[UPDATED] ${zshrc} → OBSIDIAN_VAULT="${vault}"`);
  }

  // --- Statusline ---
  const statuslineSrc = path.join(__dirname, 'statusline.sh');
  const statuslineDest = path.join(globalClaudeDir, 'statusline.sh');

  let writeStatusline = true;
  if (fs.existsSync(statuslineDest) && !yes) {
    const { default: inquirer } = await import('inquirer');
    const { override } = await inquirer.prompt([{
      type: 'confirm',
      name: 'override',
      message: '~/.claude/statusline.sh already exists. Overwrite with latest?',
      default: false,
    }]);
    writeStatusline = override;
  }

  if (writeStatusline) {
    fs.copyFileSync(statuslineSrc, statuslineDest);
    fs.chmodSync(statuslineDest, 0o755);
    console.log(`[CREATED] ${statuslineDest}`);
  }

  // Write settings.json for statusLine.
  const settingsPath = path.join(globalClaudeDir, 'settings.json');
  const settings = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    : {};
  if (writeStatusline) {
    settings.statusLine = { type: 'command', command: statuslineDest };
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log(`[UPDATED] ${settingsPath} → ${writeStatusline ? 'statusLine' : 'settings checked'}`);

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

  console.log('[SUCCESS] Claude Code configured.');
}

module.exports = { setup };
