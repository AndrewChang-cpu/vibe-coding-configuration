export const meta = {
  name: 'review-fix-loop',
  description: 'Review → taskify → work loop until CLEAN, BLOCKED, or NEEDS_USER_INPUT. Claude Code analog of the Codex review-fix-loop skill.',
  phases: [
    { title: 'Review' },
    { title: 'Taskify' },
    { title: 'Work' },
  ],
}

// args: { maxIterations?: number, maxWorkCycles?: number }
const maxIterations = (args && typeof args.maxIterations === 'number') ? args.maxIterations : 10
const maxWorkCycles = (args && typeof args.maxWorkCycles === 'number') ? args.maxWorkCycles : 10

const PREP_SCHEMA = {
  type: 'object',
  required: ['files', 'pythonFiles', 'documentedDecisions', 'checklist'],
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    pythonFiles: { type: 'array', items: { type: 'string' } },
    documentedDecisions: { type: 'string' },
    checklist: { type: 'string' },
  },
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

function terminal(status) {
  return status === 'CLEAN' || status === 'NEEDS_USER_INPUT' || status === 'BLOCKED'
}

function taskifyPrompt() {
  return `Use vibe:review-fix-taskify (general-plugin:review-fix-taskify).

If the Skill tool is not available or general-plugin:review-fix-taskify cannot be invoked, return BLOCKED immediately with blocked_reason: "Skill tool unavailable in CC workflow subagent — cannot invoke general-plugin:review-fix-taskify. The CC review-fix-loop workflow requires skill access."`
}

function workPrompt() {
  return `Use vibe:review-fix-work (general-plugin:review-fix-work).

If the Skill tool is not available or general-plugin:review-fix-work cannot be invoked, return BLOCKED immediately with blocked_reason: "Skill tool unavailable in CC workflow subagent — cannot invoke general-plugin:review-fix-work. The CC review-fix-loop workflow requires skill access."`
}

// ── main loop ────────────────────────────────────────────────────────────────

let finalResult = null

for (let i = 1; i <= maxIterations; i++) {
  log(`Iteration ${i}/${maxIterations} — review`)

  // Gather file list, checklist, and documented decisions once before spawning reviewers.
  const prep = await agent(
    `Gather review prep data and return structured JSON.

1. Run: git diff HEAD --name-only
   If empty, fall back to: git diff --cached --name-only
   Filter out: package-lock.json, yarn.lock, files ending in .lock, pnpm-lock.yaml, anything under dist/, build/, files ending in .min.js or .min.css, anything under .plan/
   Return filtered list as "files". Return the subset ending in .py as "pythonFiles".

2. If .plan/PLAN.md exists, read it and extract Out of Scope, Assumptions, and documented deferrals/placeholders into "documentedDecisions". Otherwise return empty string.

3. Try to read: ~/.claude/plugins/marketplaces/vibe-coding/general-plugin/skills/review/checklist.md
   If found, return its full content as "checklist". If not found, return empty string.`,
    { label: `prep:${i}`, phase: 'Review', schema: PREP_SCHEMA }
  )

  if (!prep) {
    finalResult = { status: 'BLOCKED', summary: 'Review prep agent returned null', blocked_reason: 'agent returned null' }
    break
  }

  const fileList = (prep.files || []).join('\n') || '(none)'
  const checklist = prep.checklist || '(none — use built-in judgment)'
  const documentedDecisions = prep.documentedDecisions || 'None'

  // Spawn all three adversarial reviewers in parallel at the workflow level.
  // The previous approach delegated through review-fix-review → vibe:review → Agent(...)
  // which broke because workflow subagents cannot spawn further sub-agents via the Agent tool.
  const [codeFindings, pythonFindings, secFindings] = await parallel([
    () => agent(
      `Depth: deep
Files:
${fileList}

Checklist:
${checklist}

Documented Decisions:
${documentedDecisions}`,
      { agentType: 'code-reviewer', label: `code-review:${i}`, phase: 'Review' }
    ),
    () => (prep.pythonFiles || []).length === 0
      ? Promise.resolve('No Python files in diff')
      : agent(
          `Documented Decisions:
${documentedDecisions}`,
          { agentType: 'python-reviewer', label: `python-review:${i}`, phase: 'Review' }
        ),
    () => agent(
      `Files:
${fileList}

Documented Decisions:
${documentedDecisions}`,
      { agentType: 'security-reviewer', label: `security-review:${i}`, phase: 'Review' }
    ),
  ])

  // Pass findings into review-fix-review, skipping Stage 1 (vibe:review) since the
  // three adversarial agents above have already produced the review output.
  const review = await agent(
    `Use vibe:review-fix-review (general-plugin:review-fix-review).

The review (Stage 1) has already been completed externally. Do NOT invoke vibe:review.
Skip Stage 1 entirely and proceed directly to Stage 2 (Normalize) using the findings below.

CODE REVIEW FINDINGS:
${codeFindings || 'No findings reported'}

PYTHON REVIEW FINDINGS:
${pythonFindings || 'No Python files or no findings'}

SECURITY REVIEW FINDINGS:
${secFindings || 'No findings reported'}`,
    { label: `normalize:${i}`, phase: 'Review', schema: STATUS_SCHEMA }
  )

  if (!review) {
    finalResult = { status: 'BLOCKED', summary: 'Review normalize agent returned null', blocked_reason: 'agent returned null' }
    break
  }

  if (terminal(review.status)) {
    finalResult = review
    break
  }

  log(`Iteration ${i}/${maxIterations} — taskify`)

  const taskify = await agent(taskifyPrompt(), {
    label: `taskify:${i}`,
    phase: 'Taskify',
    schema: STATUS_SCHEMA,
  })

  if (!taskify) {
    finalResult = { status: 'BLOCKED', summary: 'Taskify agent returned null', blocked_reason: 'agent returned null' }
    break
  }

  if (terminal(taskify.status)) {
    finalResult = taskify
    break
  }

  log(`Iteration ${i}/${maxIterations} — work`)

  let workResult = null
  for (let c = 1; c <= maxWorkCycles; c++) {
    const w = await agent(workPrompt(), {
      label: `work:${i}.${c}`,
      phase: 'Work',
      schema: STATUS_SCHEMA,
    })

    if (!w) {
      workResult = { status: 'BLOCKED', summary: 'Work agent returned null', blocked_reason: 'agent returned null' }
      break
    }
    workResult = w
    if (workResult.status !== 'WORK_REMAINING') break
  }

  if (!workResult) {
    finalResult = { status: 'BLOCKED', summary: 'Work phase did not run', blocked_reason: 'internal error' }
    break
  }

  if (terminal(workResult.status)) {
    finalResult = workResult
    break
  }

  if (workResult.status === 'WORK_REMAINING') {
    finalResult = {
      status: 'BLOCKED',
      summary: `Work returned WORK_REMAINING after ${maxWorkCycles} cycles`,
      blocked_reason: `max work cycles (${maxWorkCycles}) reached without completing tasks`,
    }
    break
  }

  log(`Iteration ${i} batch complete — running another review pass`)
}

if (!finalResult) {
  finalResult = {
    status: 'BLOCKED',
    summary: `Max iterations (${maxIterations}) reached`,
    blocked_reason: `max iterations reached`,
  }
}

log(`Final: ${finalResult.status} — ${finalResult.summary}`)
return finalResult
