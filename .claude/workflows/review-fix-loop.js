export const meta = {
  name: 'review-fix-loop',
  description: 'Review → taskify → work → review loop until CLEAN, BLOCKED, or NEEDS_USER_INPUT. Claude Code analog of the Codex review-fix-loop skill.',
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
      { agentType: 'code-reviewer', label: `code-review:${label}`, phase: 'Review' }
    ),
    () => agent(
      `Review Python files in the current git diff. If no .py files exist in the diff, output "No Python files to review" and stop.`,
      { agentType: 'python-reviewer', label: `python-review:${label}`, phase: 'Review' }
    ),
    () => agent(
      `Review the current git diff for security vulnerabilities.`,
      { agentType: 'security-reviewer', label: `security-review:${label}`, phase: 'Review' }
    ),
  ])

  return agent(
    `Use vibe:review-fix-review (general-plugin:review-fix-review).

The review (Stage 1) has already been completed externally. Do NOT invoke vibe:review.
Skip Stage 1 entirely and proceed directly to Stage 2 (Normalize) using the findings below.

CODE REVIEW FINDINGS:
${codeFindings || 'No findings reported'}

PYTHON REVIEW FINDINGS:
${pythonFindings || 'No Python files or no findings'}

SECURITY REVIEW FINDINGS:
${secFindings || 'No findings reported'}`,
    { label: `normalize:${label}`, phase: 'Review', schema: STATUS_SCHEMA }
  )
}

// ── initial review ───────────────────────────────────────────────────────────

log('Initial review')
const initialReview = await runReview('initial')

let finalResult = null

if (!initialReview) {
  finalResult = { status: 'BLOCKED', summary: 'Initial review agent returned null', blocked_reason: 'agent returned null' }
} else if (terminal(initialReview.status)) {
  finalResult = initialReview
}

// ── fix loop: taskify → work → review ────────────────────────────────────────

if (!finalResult) {
  for (let i = 1; i <= maxIterations; i++) {
    log(`Fix iteration ${i}/${maxIterations} — taskify`)

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

    log(`Fix iteration ${i}/${maxIterations} — work`)

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

    if (workResult.status === 'NEEDS_USER_INPUT' || workResult.status === 'BLOCKED') {
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

    log(`Fix iteration ${i}/${maxIterations} — re-review`)

    const review = await runReview(i)

    if (!review) {
      finalResult = { status: 'BLOCKED', summary: 'Re-review agent returned null', blocked_reason: 'agent returned null' }
      break
    }

    if (terminal(review.status)) {
      finalResult = review
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
  }
}

log(`Final: ${finalResult.status} — ${finalResult.summary}`)
return finalResult
