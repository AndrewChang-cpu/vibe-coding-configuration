# Repository Instructions

This repository is the source for the vibe-coding setup and plugin marketplace. Treat it as source code that affects global Claude Code and Codex installations only after the relevant changes are committed, pushed, and the setup process is run with `npx vibe-setup@latest`.

## Global Plugin State

Global plugins must not be expected to reflect the local state of this `vibe-coding-configuration` checkout.

Local edits in this repository do not update installed global plugins by themselves. The correct propagation flow is:

1. Change this repository.
2. Commit and push the changes.
3. Run the setup process with `npx vibe-setup@latest`, which pulls from the pushed Git state.

If global Claude Code or Codex behavior does not match local files, first verify whether the local changes have been pushed and reinstalled/upgraded. Do not assume the global plugin cache is reading directly from this checkout.

## Supported Platforms

Only Claude Code and Codex are supported right now.

Their setup behavior should mirror each other in functionality whenever practical. If a capability is added, removed, or changed for one platform, check whether the other platform needs the same behavior.

## Failure Handling

Setup failures must fail loudly.

Quiet failures, warning-only failures, swallowed command errors, or optional handling for required setup commands count as severe errors. Required setup steps should stop the setup process when they fail and surface a useful error message.

## Testing

Testing should not be done in this repository.

Do not add repo-local test suites or test commands here. Verification should be handled outside this repository or through the downstream setup/plugin flow after changes are pushed.
