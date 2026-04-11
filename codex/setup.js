const fs = require('fs');
const path = require('path');
const { readTemplate, writeFile, writeFileIfAbsent, execSilent } = require('../shared/utils');

function setup(cwd) {
  console.log('[INFO] Configuring Codex...');

  // --- .vibe base ---
  const vibe = path.join(cwd, '.vibe');
  fs.mkdirSync(path.join(vibe, 'skills'), { recursive: true });

  writeFileIfAbsent(path.join(vibe, 'project-context.md'), readTemplate('project-context.md'));
  writeFileIfAbsent(path.join(vibe, 'mcp-triggers.md'), readTemplate('mcp-triggers.md'));
  writeFileIfAbsent(path.join(vibe, 'lessons.md'), readTemplate('lessons.md'));

  const projectContext = fs.readFileSync(path.join(vibe, 'project-context.md'), 'utf8');
  const mcpContent = fs.readFileSync(path.join(vibe, 'mcp-triggers.md'), 'utf8');
  const opsRules = readTemplate('operational-rules.md');

  // --- AGENTS.md ---
  const agentsMd = `# Agent Instructions
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

  writeFile(path.join(cwd, 'AGENTS.md'), agentsMd);

  // --- .codex/config.json (Codex env config) ---
  const codexDir = path.join(cwd, '.codex');
  fs.mkdirSync(codexDir, { recursive: true });
  const codexConfig = {
    model: 'codex-1',
    instructions: 'See AGENTS.md for full agent instructions.',
    context: ['.vibe/project-context.md', '.vibe/mcp-triggers.md', '.vibe/lessons.md'],
  };
  writeFileIfAbsent(path.join(codexDir, 'config.json'), JSON.stringify(codexConfig, null, 2));

  // --- Get Shit Done ---
  execSilent(`npx get-shit-done-cc@latest`);

  console.log('[SUCCESS] Codex configured.');
}

module.exports = { setup };
