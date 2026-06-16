const readline = require('readline');

function ask(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function promptInput(message, defaultValue = '') {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await ask(`${message}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function promptConfirm(message, defaultValue = false) {
  const suffix = defaultValue ? 'Y/n' : 'y/N';
  const answer = (await ask(`${message} (${suffix}): `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return answer === 'y' || answer === 'yes';
}

async function promptSelect(message, choices, defaultIndex = 0) {
  console.log(message);
  choices.forEach((choice, i) => console.log(`  ${i + 1}) ${choice}`));
  const answer = (await ask(`Select [1-${choices.length}] (default ${defaultIndex + 1}): `)).trim();
  const idx = parseInt(answer, 10);
  if (Number.isInteger(idx) && idx >= 1 && idx <= choices.length) return choices[idx - 1];
  return choices[defaultIndex];
}

module.exports = { promptInput, promptConfirm, promptSelect };
