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

function reviewPrompt() {
  return `Use vibe:review-fix-review (general-plugin:review-fix-review).

If the Skill tool is not available or general-plugin:review-fix-review cannot be invoked, return BLOCKED immediately with blocked_reason: "Skill tool unavailable in CC workflow subagent — cannot invoke general-plugin:review-fix-review. The CC review-fix-loop workflow requires skill access."`
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

  const review = await agent(reviewPrompt(), {
    label: `review:${i}`,
    phase: `Review ${i}`,
    schema: STATUS_SCHEMA,
  })

  if (!review) {
    finalResult = { status: 'BLOCKED', summary: 'Review agent returned null', blocked_reason: 'agent returned null' }
    break
  }

  if (terminal(review.status)) {
    finalResult = review
    break
  }

  log(`Iteration ${i}/${maxIterations} — taskify`)

  const taskify = await agent(taskifyPrompt(), {
    label: `taskify:${i}`,
    phase: `Taskify ${i}`,
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
      phase: `Work ${i}`,
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

  // workResult.status === 'CLEAN' — batch done, continue to next review pass
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
