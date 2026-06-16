#!/bin/bash
# request-recap — ask for a brief recap, but only when the response actually changed files

set -euo pipefail

HOOK_INPUT=$(cat)

# Do not recurse when the model is already responding to this Stop hook.
if printf '%s' "$HOOK_INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.exit(JSON.parse(s).stop_hook_active===true?0:1)}catch{process.exit(1)}})'; then
  exit 0
fi

TRANSCRIPT=$(printf '%s' "$HOOK_INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).transcript_path||"")}catch{process.stdout.write("")}})')

# Scan the transcript backwards from the end, stopping at the last real user
# message (content is a plain string — tool_results have array content), and
# check whether any Edit/Write/NotebookEdit tool calls happened since then.
FILES_CHANGED="true"
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  FILES_CHANGED=$(node -e '
    const fs=require("fs");
    const lines=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean)
      .map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
    let changed=false;
    for(let i=lines.length-1;i>=0;i--){
      const m=lines[i], c=m.message&&m.message.content;
      if(m.type==="user"&&typeof c==="string") break;        // stop at last real user msg
      if(Array.isArray(c)&&c.some(x=>x.type==="tool_use"&&["Edit","Write","NotebookEdit"].includes(x.name))) changed=true;
    }
    process.stdout.write(changed?"true":"false");
  ' "$TRANSCRIPT" 2>/dev/null) || FILES_CHANGED="true"
fi

if [[ "$FILES_CHANGED" != "true" ]]; then
  exit 0
fi

PROMPT='In 1-3 sentences: which file(s) did you change, what did you change in them, and justify your changes in the context of the conversayion. No conversation summary, no lessons.'

REASON="$PROMPT" node -e 'process.stdout.write(JSON.stringify({decision:"block",reason:process.env.REASON}))'
exit 0
