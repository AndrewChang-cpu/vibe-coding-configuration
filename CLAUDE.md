# Repository Instructions

This repository is the source for Claude Code setup (`claude/setup.js`, run via `npx vibe-setup@latest`) and the `general-plugin` Claude Code plugin (skills, agents, hooks).

## Global Plugin State

Global Claude Code configuration and the installed `general-plugin` plugin must not be expected to reflect the local state of this `vibe-coding-configuration` checkout.

Local edits in this repository do not update installed global config or plugins by themselves. Installing and updating the plugin is a manual, local step. If global Claude Code behavior does not match local files, do not assume it is reading directly from this checkout.

## Failure Handling

Setup failures must fail loudly.

Quiet failures, warning-only failures, swallowed command errors, or optional handling for required setup commands count as severe errors. Required setup steps should stop the setup process when they fail and surface a useful error message.

## Testing

Testing should not be done in this repository.

Do not add repo-local test suites or test commands here. Verification should be handled outside this repository or through the downstream setup/plugin flow after changes are pushed.
