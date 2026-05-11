const fs = require('fs');
const os = require('os');
const path = require('path');
const { readTemplate, writeFile, writeFileIfAbsent, execSilent } = require('../shared/utils');

async function setup(cwd, { yes = false } = {}) {
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

  writeFileIfAbsent(path.join(vibe, 'lessons.md'), readTemplate('lessons.md'));

  // --- MCP servers ---
  const isWindows = process.platform === 'win32';
  const npx = isWindows ? 'npx.cmd' : 'npx';

  // Read API keys: env vars take precedence, .env file as fallback
  let context7Key = process.env.CONTEXT7_API_KEY || '';
  let tavilyKey = process.env.TAVILY_API_KEY || '';
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const [k, v] = line.split('=');
      if (k && v) {
        if (k.trim() === 'CONTEXT7_API_KEY' && !context7Key) context7Key = v.trim();
        if (k.trim() === 'TAVILY_API_KEY' && !tavilyKey) tavilyKey = v.trim();
      }
    }
  }

  const mcpServers = [
    'postgres',
    'github',
    'sequential-thinking',
    'puppeteer',
    'context7',
    'tavily',
  ];
  for (const s of mcpServers) execSilent(`claude mcp remove ${s}`);

  execSilent(`claude mcp add --transport stdio postgres -- ${npx} -y @modelcontextprotocol/server-postgres postgresql://localhost:5432/postgres`);
  execSilent(`claude mcp add --transport stdio github -- ${npx} -y @modelcontextprotocol/server-github`);
  execSilent(`claude mcp add --transport stdio sequential-thinking -- ${npx} -y @modelcontextprotocol/server-sequential-thinking`);
  execSilent(`claude mcp add --transport stdio puppeteer -- ${npx} -y @modelcontextprotocol/server-puppeteer`);
  execSilent(`claude mcp add --scope user --transport stdio context7 -- ${npx} -y @upstash/context7-mcp --api-key ${context7Key}`);
  execSilent(`claude mcp add --transport stdio tavily -e TAVILY_API_KEY=${tavilyKey} -- ${npx} -y tavily-mcp`);

  // --- Plugin ---
  execSilent(`claude plugin add https://github.com/AndrewChang-cpu/vibe-coding-configuration`);
  execSilent(`claude plugin install general-plugin@vibe-coding`);

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

    const settingsPath = path.join(globalClaudeDir, 'settings.json');
    const settings = fs.existsSync(settingsPath)
      ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      : {};
    settings.statusLine = { type: 'command', command: statuslineDest };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`[UPDATED] ${settingsPath} → statusLine`);
  }

  // --- Get Shit Done ---
  execSilent(`npx get-shit-done-cc@latest`);

  console.log('[SUCCESS] Claude Code configured.');
}

module.exports = { setup };
