#!/usr/bin/env node

const path = require('path');

const args = process.argv.slice(2);
const cwd = process.cwd();

const flagYes = args.includes('--yes') || args.includes('-y');
const flagReconfigure = args.includes('--reconfigure') || args.includes('-r');

async function run() {
  console.log(`[INFO] Setting up: claude in ${cwd}`);

  const { setup } = require(path.join(__dirname, '..', 'claude', 'setup.js'));
  await setup(cwd, { yes: flagYes, reconfigure: flagReconfigure });

  console.log('[SUCCESS] Bootstrapping complete.');
}

run().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
