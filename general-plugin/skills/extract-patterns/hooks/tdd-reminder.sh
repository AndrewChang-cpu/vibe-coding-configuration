#!/bin/bash
# tdd-reminder — remind to write tests when a new non-test Python file is written

set -euo pipefail

HOOK_INPUT=$(cat)

FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // ""')

# Only trigger for Python source files
if [[ "$FILE_PATH" != *.py ]]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Skip test files themselves
if [[ "$BASENAME" == test_* ]] || [[ "$BASENAME" == *_test.py ]]; then
  exit 0
fi

echo "🧪 New Python file: $BASENAME — if this contains business logic, write the test first (RED phase) before implementing. Use /vibe:tdd or follow the TDD skill."
exit 0
