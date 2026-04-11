const fs = require('fs');
const path = require('path');
const { readTemplate, writeFile, writeFileIfAbsent, execSilent } = require('../shared/utils');

function setup(cwd) {
  console.log('[INFO] Configuring Claude Code...');

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(path.join(vibe, 'skills'), { recursive: true });

  writeFileIfAbsent(path.join(vibe, 'project-context.md'), readTemplate('project-context.md'));
  writeFileIfAbsent(path.join(vibe, 'mcp-triggers.md'), readTemplate('mcp-triggers.md'));
  writeFileIfAbsent(path.join(vibe, 'lessons.md'), readTemplate('lessons.md'));

  const projectContext = fs.readFileSync(path.join(vibe, 'project-context.md'), 'utf8');
  const mcpContent = fs.readFileSync(path.join(vibe, 'mcp-triggers.md'), 'utf8');
  const opsRules = readTemplate('operational-rules.md');

  // --- CLAUDE.md ---
  const claudeMd = `# Global Agent Instructions
You are an expert software architect. Write clean, secure, and optimized code while strictly adhering to the project context and constraints.

## Primary Directives
1. **Plan Before Coding**: For any task touching >2 files, output an architectural plan first.
2. **Minimal Diff**: Only modify files explicitly required.
3. **Run Checks**: Always run linting and testing commands after making logic changes.
4. **Follow Conventions**: Match the existing code style. Prefer clarity over cleverness.

---

${projectContext}

## Extended Capabilities
ALWAYS read \`.vibe/mcp-triggers.md\` before executing complex tasks or using external tools.

---

${opsRules}

---

${mcpContent}

---

## Lessons & Self-Correction
Read \`.vibe/lessons.md\` at the start of each session. After ANY user correction, immediately add the pattern to \`.vibe/lessons.md\`.
`;

  writeFile(path.join(cwd, 'CLAUDE.md'), claudeMd);

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

  // --- Get Shit Done ---
  execSilent(`npx get-shit-done-cc@latest`);

  console.log('[SUCCESS] Claude Code configured.');
}

module.exports = { setup };
