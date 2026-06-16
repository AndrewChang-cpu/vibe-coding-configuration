import fs from 'node:fs'
import path from 'node:path'

export const meta = {
  name: 'review-fix-loop',
  description: 'Review → taskify → work → review loop until CLEAN, BLOCKED, or NEEDS_USER_INPUT.',
  phases: [
    { title: 'Review' },
    { title: 'Taskify' },
    { title: 'Work' },
  ],
}

// args: { maxIterations?: number, maxWorkCycles?: number }
const maxIterations = (args && typeof args.maxIterations === 'number') ? args.maxIterations : 10
const maxWorkCycles = (args && typeof args.maxWorkCycles === 'number') ? args.maxWorkCycles : 10

const outputDir = path.join('.plan', 'review-fix-loop-output')
const paths = {
  outputDir,
  tasks: path.join(outputDir, 'tasks.json'),
  state: path.join(outputDir, 'state.json'),
  reviewIterations: path.join(outputDir, 'review-iterations'),
}

const STATUS_SCHEMA = {
  type: 'object',
  required: ['status', 'summary'],
  properties: {
    status: { type: 'string', enum: ['CLEAN', 'WORK_REMAINING', 'NEEDS_USER_INPUT', 'BLOCKED'] },
    summary: { type: 'string' },
    question: { type: 'string' },
    blocked_reason: { type: 'string' },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'description'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          file: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
}

function terminal(status) {
  return status === 'CLEAN' || status === 'NEEDS_USER_INPUT' || status === 'BLOCKED'
}

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function updateState(patch) {
  const current = readJson(paths.state)
  writeJson(paths.state, {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  })
}

function initializeLoopState() {
  fs.mkdirSync(paths.outputDir, { recursive: true })
  fs.mkdirSync(paths.reviewIterations, { recursive: true })

  if (!fs.existsSync(paths.tasks)) {
    writeJson(paths.tasks, { tasks: [] })
  }

  updateState({
    status: 'WORK_REMAINING',
    iteration: 0,
    max_iterations: maxIterations,
    max_work_cycles: maxWorkCycles,
    last_phase: 'init',
    needs_user_input: null,
    blocked_reason: null,
  })
}

function persistFinal(result, phase) {
  updateState({
    status: result.status,
    last_phase: phase,
    last_summary: result.summary,
    needs_user_input: result.status === 'NEEDS_USER_INPUT' ? result.question || result.summary : null,
    blocked_reason: result.status === 'BLOCKED' ? result.blocked_reason || result.summary : null,
  })

  return result
}

function taskifyPrompt() {
  return `Use vibe:review-fix-taskify (general-plugin:review-fix-taskify).

If the Skill tool is not available or general-plugin:review-fix-taskify cannot be invoked, return BLOCKED immediately with blocked_reason: "Skill tool unavailable in CC workflow subagent — cannot invoke general-plugin:review-fix-taskify. The CC review-fix-loop workflow requires skill access."`
}

function workPrompt() {
  return `Use vibe:review-fix-work (general-plugin:review-fix-work).

If the Skill tool is not available or general-plugin:review-fix-work cannot be invoked, return BLOCKED immediately with blocked_reason: "Skill tool unavailable in CC workflow subagent — cannot invoke general-plugin:review-fix-work. The CC review-fix-loop workflow requires skill access."`
}

async function runReview(label) {
  const [codeFindings, pythonFindings, secFindings] = await parallel([
    () => agent(
      `Depth: deep

CRITICAL: Your Setup section instructs you to load the checklist from ~/.claude/plugins/marketplaces/vibe-coding/general-plugin/skills/review/checklist.md. If that file cannot be read for any reason, STOP IMMEDIATELY and output only: "CHECKLIST NOT FOUND — aborting review. Cannot proceed without checklist." Do not attempt the review without the checklist.`,
      { agentType: 'code-reviewer', label: `code-review:${label}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    ),
    () => agent(
      `Review Python files in the current git diff. If no .py files exist in the diff, return an empty findings array and stop.`,
      { agentType: 'python-reviewer', label: `python-review:${label}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    ),
    () => agent(
      `Review the current git diff for security vulnerabilities.`,
      { agentType: 'security-reviewer', label: `security-review:${label}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    ),
  ])

  const codeList = (codeFindings && codeFindings.findings) || []
  const pythonList = (pythonFindings && pythonFindings.findings) || []
  const secList = (secFindings && secFindings.findings) || []
  const allFindings = JSON.stringify({ code: codeList, python: pythonList, security: secList })

  return agent(
    `Use vibe:review-fix-review (general-plugin:review-fix-review).

The review (Stage 1) has already been completed externally. Do NOT invoke vibe:review.
Skip Stage 1 entirely and proceed directly to Stage 2 (Normalize) using the findings below.

FINDINGS (JSON):
${allFindings}`,
    { label: `normalize:${label}`, phase: 'Review', schema: STATUS_SCHEMA }
  )
}

// ── initial review ───────────────────────────────────────────────────────────

initializeLoopState()

log('Initial review')
updateState({ status: 'WORK_REMAINING', iteration: 1, last_phase: 'review', work_cycle: null })
const initialReview = await runReview('initial')

let finalResult = null
let finalPhase = 'review'

if (!initialReview) {
  finalResult = { status: 'BLOCKED', summary: 'Initial review agent returned null', blocked_reason: 'agent returned null' }
} else if (terminal(initialReview.status)) {
  finalResult = initialReview
}

// ── fix loop: taskify → work → review ────────────────────────────────────────

if (!finalResult) {
  for (let i = 1; i <= maxIterations; i++) {
    log(`Fix iteration ${i}/${maxIterations} — taskify`)
    updateState({ status: 'WORK_REMAINING', iteration: i, last_phase: 'taskify', work_cycle: null })

    const taskify = await agent(taskifyPrompt(), {
      label: `taskify:${i}`,
      phase: 'Taskify',
      schema: STATUS_SCHEMA,
      agentType: 'claude',
    })

    if (!taskify) {
      finalResult = { status: 'BLOCKED', summary: 'Taskify agent returned null', blocked_reason: 'agent returned null' }
      finalPhase = 'taskify'
      break
    }

    if (terminal(taskify.status)) {
      finalResult = taskify
      finalPhase = 'taskify'
      break
    }

    log(`Fix iteration ${i}/${maxIterations} — work`)

    let workResult = null
    for (let c = 1; c <= maxWorkCycles; c++) {
      updateState({ status: 'WORK_REMAINING', iteration: i, last_phase: 'work', work_cycle: c })
      const w = await agent(workPrompt(), {
        label: `work:${i}.${c}`,
        phase: 'Work',
        schema: STATUS_SCHEMA,
        agentType: 'claude',
      })

      if (!w) {
        workResult = { status: 'BLOCKED', summary: 'Work agent returned null', blocked_reason: 'agent returned null' }
        finalPhase = 'work'
        break
      }
      workResult = w
      if (workResult.status !== 'WORK_REMAINING') break
    }

    if (!workResult) {
      finalResult = { status: 'BLOCKED', summary: 'Work phase did not run', blocked_reason: 'internal error' }
      finalPhase = 'work'
      break
    }

    if (workResult.status === 'NEEDS_USER_INPUT' || workResult.status === 'BLOCKED') {
      finalResult = workResult
      finalPhase = 'work'
      break
    }

    if (workResult.status === 'WORK_REMAINING') {
      finalResult = {
        status: 'BLOCKED',
        summary: `Work returned WORK_REMAINING after ${maxWorkCycles} cycles`,
        blocked_reason: `max work cycles (${maxWorkCycles}) reached without completing tasks`,
      }
      finalPhase = 'work'
      break
    }

    log(`Fix iteration ${i}/${maxIterations} — re-review`)
    updateState({ status: 'WORK_REMAINING', iteration: i + 1, last_phase: 'review', work_cycle: null })

    const review = await runReview(i)

    if (!review) {
      finalResult = { status: 'BLOCKED', summary: 'Re-review agent returned null', blocked_reason: 'agent returned null' }
      finalPhase = 'review'
      break
    }

    if (terminal(review.status)) {
      finalResult = review
      finalPhase = 'review'
      break
    }

    // review returned WORK_REMAINING — loop continues with next fix iteration
  }

  if (!finalResult) {
    finalResult = {
      status: 'BLOCKED',
      summary: `Max iterations (${maxIterations}) reached`,
      blocked_reason: `max iterations reached`,
    }
    finalPhase = 'loop'
  }
}

log(`Final: ${finalResult.status} — ${finalResult.summary}`)
return persistFinal(finalResult, finalPhase)
