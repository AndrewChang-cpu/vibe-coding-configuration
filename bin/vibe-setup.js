#!/usr/bin/env node

const path = require('path');

const args = process.argv.slice(2);
const cwd = process.cwd();

const flagClaude = args.includes('--claude');
const flagCursor = args.includes('--cursor');
const flagCodex = args.includes('--codex');
const flagAll = args.includes('--all');
const flagYes = args.includes('--yes') || args.includes('-y');

async function run() {
  let tools = [];

  if (flagAll) {
    tools = ['claude', 'cursor', 'codex'];
  } else if (flagClaude || flagCursor || flagCodex) {
    if (flagClaude) tools.push('claude');
    if (flagCursor) tools.push('cursor');
    if (flagCodex) tools.push('codex');
  } else {
    // Interactive prompt
    const { default: inquirer } = await import('inquirer');
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Which tools do you want to set up?',
        choices: [
          { name: 'Claude Code', value: 'claude' },
          { name: 'Cursor', value: 'cursor' },
          { name: 'Codex', value: 'codex' },
          { name: 'All', value: 'all' },
        ],
      },
    ]);

    if (selected.includes('all')) {
      tools = ['claude', 'cursor', 'codex'];
    } else {
      tools = selected;
    }
  }

  if (tools.length === 0) {
    console.log('[INFO] No tools selected. Exiting.');
    process.exit(0);
  }

  console.log(`[INFO] Setting up: ${tools.join(', ')} in ${cwd}`);

  for (const tool of tools) {
    const { setup } = require(path.join(__dirname, '..', tool, 'setup.js'));
    await setup(cwd, { yes: flagYes });
  }

  console.log('[SUCCESS] Bootstrapping complete.');
}

run().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
