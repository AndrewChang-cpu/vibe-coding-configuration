#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const STATUSES = new Set(['CLEAN', 'WORK_REMAINING', 'NEEDS_USER_INPUT', 'BLOCKED']);
let activePaths = null;

function parseArgs(argv) {
  const args = {
    repo: process.cwd(),
    maxIterations: 10,
    maxWorkCycles: 10,
    codexBin: 'codex',
    approvalPolicy: 'never',
    ephemeral: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') args.repo = argv[++i];
    else if (arg === '--max-iterations') args.maxIterations = Number(argv[++i]);
    else if (arg === '--max-work-cycles') args.maxWorkCycles = Number(argv[++i]);
    else if (arg === '--codex-bin') args.codexBin = argv[++i];
    else if (arg === '--approval-policy') args.approvalPolicy = argv[++i];
    else if (arg === '--no-ephemeral') args.ephemeral = false;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.maxIterations) || args.maxIterations < 1) {
    throw new Error('--max-iterations must be a positive integer');
  }
  if (!Number.isInteger(args.maxWorkCycles) || args.maxWorkCycles < 1) {
    throw new Error('--max-work-cycles must be a positive integer');
  }
  return args;
}

function printHelp() {
  console.log(`Usage: review-fix-loop.js [options]

Options:
  --repo <path>              Repository to run in (default: cwd)
  --max-iterations <n>       Max review/taskify/work iterations (default: 10)
  --max-work-cycles <n>      Max work cycles per iteration (default: 10)
  --codex-bin <path>         Codex executable (default: codex)
  --approval-policy <policy> codex exec approval policy (default: never)
  --no-ephemeral            Persist codex exec sessions
`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('empty response');
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first !== -1 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error('response did not contain JSON');
  }
}

function normalizeResult(raw, phase) {
  const result = extractJsonObject(raw);
  if (!STATUSES.has(result.status)) {
    throw new Error(`${phase} returned invalid status: ${result.status}`);
  }
  return {
    status: result.status,
    summary: String(result.summary || ''),
    question: result.question ? String(result.question) : null,
    blocked_reason: result.blocked_reason ? String(result.blocked_reason) : null,
  };
}

function updateState(paths, patch) {
  const current = readJson(paths.state, {});
  writeJson(paths.state, {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

function runCodexPhase(args, paths, phase, prompt) {
  const tmpOut = path.join(os.tmpdir(), `review-fix-loop-${process.pid}-${phase}.json`);
  try {
    fs.rmSync(tmpOut, { force: true });
  } catch {
    // Ignore cleanup failures; codex will overwrite the file if it can.
  }

  const codexArgs = ['exec', '--cd', args.repo, '--output-last-message', tmpOut];
  if (args.ephemeral) codexArgs.push('--ephemeral');
  if (args.approvalPolicy) codexArgs.push('--ask-for-approval', args.approvalPolicy);
  codexArgs.push(prompt);

  console.log(`\n[review-fix-loop] phase: ${phase}`);
  const startedAt = new Date().toISOString();
  updateState(paths, { status: 'WORK_REMAINING', last_phase: phase, phase_started_at: startedAt });

  const proc = spawnSync(args.codexBin, codexArgs, {
    cwd: args.repo,
    stdio: 'inherit',
    env: process.env,
  });

  if (proc.error) {
    throw new Error(`${phase} failed to start: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    throw new Error(`${phase} exited with status ${proc.status}`);
  }
  if (!fs.existsSync(tmpOut)) {
    throw new Error(`${phase} did not write an output message`);
  }

  const raw = fs.readFileSync(tmpOut, 'utf8');
  fs.rmSync(tmpOut, { force: true });
  const result = normalizeResult(raw, phase);
  updateState(paths, {
    status: result.status,
    last_phase: phase,
    last_summary: result.summary,
    needs_user_input: result.status === 'NEEDS_USER_INPUT' ? result.question || result.summary : null,
    blocked_reason: result.status === 'BLOCKED' ? result.blocked_reason || result.summary : null,
  });
  return result;
}

function buildReviewPrompt() {
  return `Use vibe:review-fix-review.

Return JSON only:
{
  "status": "CLEAN" | "WORK_REMAINING" | "NEEDS_USER_INPUT" | "BLOCKED",
  "summary": "brief summary",
  "question": "only when status is NEEDS_USER_INPUT",
  "blocked_reason": "only when status is BLOCKED"
}`;
}

function buildTaskifyPrompt() {
  return `Use vibe:review-fix-taskify.

Return JSON only:
{
  "status": "CLEAN" | "WORK_REMAINING" | "NEEDS_USER_INPUT" | "BLOCKED",
  "summary": "brief summary",
  "question": "only when status is NEEDS_USER_INPUT",
  "blocked_reason": "only when status is BLOCKED"
}`;
}

function buildWorkPrompt() {
  return `Use vibe:review-fix-work.

Return JSON only:
{
  "status": "CLEAN" | "WORK_REMAINING" | "NEEDS_USER_INPUT" | "BLOCKED",
  "summary": "brief summary",
  "question": "only when status is NEEDS_USER_INPUT",
  "blocked_reason": "only when status is BLOCKED"
}`;
}

function terminal(status) {
  return status === 'CLEAN' || status === 'NEEDS_USER_INPUT' || status === 'BLOCKED';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.join(args.repo, '.plan', 'review-fix-loop-output');
  const paths = {
    outputDir,
    tasks: path.join(outputDir, 'tasks.json'),
    state: path.join(outputDir, 'state.json'),
    reviewIterations: path.join(outputDir, 'review-iterations'),
  };
  activePaths = paths;

  ensureDir(paths.outputDir);
  ensureDir(paths.reviewIterations);
  if (!fs.existsSync(paths.tasks)) writeJson(paths.tasks, { tasks: [] });
  updateState(paths, {
    status: 'WORK_REMAINING',
    iteration: 0,
    max_iterations: args.maxIterations,
    last_phase: 'init',
    needs_user_input: null,
    blocked_reason: null,
  });

  for (let iteration = 1; iteration <= args.maxIterations; iteration += 1) {
    updateState(paths, { iteration });

    const review = runCodexPhase(args, paths, 'review', buildReviewPrompt());
    if (terminal(review.status)) {
      console.log(`[review-fix-loop] stopping after review: ${review.status}`);
      return review.status === 'CLEAN' ? 0 : 2;
    }

    const taskify = runCodexPhase(args, paths, 'taskify', buildTaskifyPrompt());
    if (terminal(taskify.status)) {
      console.log(`[review-fix-loop] stopping after taskify: ${taskify.status}`);
      return taskify.status === 'CLEAN' ? 0 : 2;
    }

    let work;
    for (let cycle = 1; cycle <= args.maxWorkCycles; cycle += 1) {
      updateState(paths, { work_cycle: cycle });
      work = runCodexPhase(args, paths, 'work', buildWorkPrompt());
      if (work.status !== 'WORK_REMAINING') break;
    }

    if (!work) throw new Error('work phase did not run');
    if (work.status === 'NEEDS_USER_INPUT' || work.status === 'BLOCKED') {
      console.log(`[review-fix-loop] stopping after work: ${work.status}`);
      return 2;
    }
    if (work.status === 'WORK_REMAINING') {
      updateState(paths, {
        status: 'BLOCKED',
        blocked_reason: `work still returned WORK_REMAINING after ${args.maxWorkCycles} cycles`,
      });
      console.log('[review-fix-loop] stopping: work cycle limit reached');
      return 2;
    }

    console.log('[review-fix-loop] current batch complete; running another review pass');
  }

  updateState(paths, {
    status: 'BLOCKED',
    blocked_reason: `max iterations reached (${args.maxIterations})`,
  });
  console.log(`[review-fix-loop] stopping: max iterations reached (${args.maxIterations})`);
  return 2;
}

try {
  process.exitCode = main();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  if (activePaths) {
    try {
      updateState(activePaths, {
        status: 'BLOCKED',
        blocked_reason: message,
      });
    } catch {
      // The console error below is the fallback if state cannot be written.
    }
  }
  console.error(`[review-fix-loop] ERROR: ${message}`);
  process.exitCode = 1;
}
