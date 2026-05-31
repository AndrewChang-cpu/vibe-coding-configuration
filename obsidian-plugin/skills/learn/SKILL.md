---
name: vibe:learn
description: Web-to-Vault pipeline. Fetches one or more URLs, GitHub repo URLs, or local repo paths (and crawls relevant sub-links/docs), synthesizes a Tech Reference note into 02_Wiki/Tech/<package>/, and runs the full bookkeeping pipeline. First call creates <package-slug>-overview.md; subsequent calls on the same package create focused deep-dive notes.
---

# Learn Pipeline Instructions

When the user invokes this skill with one or more URLs, GitHub repo URLs, local repo paths, or a mix — execute the following steps.

## Step 0: Verify Vault Location

Run:
```bash
echo "$OBSIDIAN_VAULT"
```
If the output is non-empty, use that value as the vault root for all subsequent steps.

If empty, ask the user:
> "The OBSIDIAN_VAULT environment variable is not set. What is the absolute path to your Obsidian vault?"

Hold the provided path as a string in your context and substitute it directly into every command and file path in subsequent steps. Also remind the user to make it permanent:
```bash
echo 'export OBSIDIAN_VAULT="/the/path/they/gave"' >> ~/.zshrc
```
Do not rely on an `export` command persisting across tool calls — substitute the literal path string everywhere.

## Step 1: Parse Input & Determine Mode

The user may provide:
- A web URL: `/vibe:learn https://pkg.go.dev/reflect`
- A GitHub repo URL: `/vibe:learn https://github.com/tiangolo/fastapi`
- A local repo path: `/vibe:learn /path/to/my/repo`
- Multiple inputs or a topic hint: `/vibe:learn https://... "topic name"`

**Classify each input as one of three source types:**

| Type | Detection |
|------|-----------|
| **GitHub** | matches `https://github.com/{owner}/{repo}[/...]` |
| **Local repo** | filesystem path where `README.md` or `.git/` exists |
| **Web** | everything else (existing behavior) |

Derive two slugs:
- **`<package-slug>`**: top-level technology/package name, 2-3 words max (e.g. `fastapi`, `reflect-package`, `react-hooks`)
- **`<topic-slug>`**: specific concept for this note, 1-3 words max (e.g. `overview`, `ValueOf`, `dependency-injection`)

**Determine the note type:**
- If `$OBSIDIAN_VAULT/02_Wiki/Tech/<package-slug>/` does **not yet exist**, or the input points to a package root/repo root → **overview** run. `<topic-slug>` = `<package-slug>-overview` (e.g. `matplotlib-overview`, `qmd-overview`).
- If `$OBSIDIAN_VAULT/02_Wiki/Tech/<package-slug>/` already exists → **deep-dive** run. `<topic-slug>` inferred from the URL path, symbol name, or user hint.

Output paths:
- Wiki note: `$OBSIDIAN_VAULT/02_Wiki/Tech/<package-slug>/<topic-slug>.md`
- Raw archive: `$OBSIDIAN_VAULT/01_Raw_Sources/MDs/web/<package-slug>/<topic-slug>.md`

Enforce the 100-character path limit on raw archive paths (relative to the vault root). Shorten `<topic-slug>` if needed.

---

## Step 2: Crawl & Fetch

Execute the branch matching the source type. All branches end by saving raw content to `$OBSIDIAN_VAULT/01_Raw_Sources/MDs/web/<package-slug>/<topic-slug>.md` with `---\n# Source: <identifier>\n---\n` separators.

### Branch A — Web (existing behavior)

1. Fetch the seed URL with WebFetch. Extract full text and all hyperlinks.
2. Filter and crawl sub-links:
   - **Overview**: same domain + path prefix, up to **15 sub-links**, prioritize API/type/function pages.
   - **Deep-dive**: links clearly related to the specific symbol, up to **8 sub-links**.
3. Deduplicate — fetch each URL once.
4. Save concatenated content.

### Branch B — GitHub repo

1. Extract `{owner}` and `{repo}` from the URL.
2. Fetch the raw README:
   `https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md`
3. Discover docs — fetch the repo tree:
   `https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1`
   Filter to `.md` files under `docs/`, `documentation/`, or `wiki/`. Fetch up to **10 files** via `https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}`.
4. Attempt to fetch `CHANGELOG.md` at the repo root.
5. Identify and fetch entry-point source files (e.g. `src/<pkg>/__init__.py`, `index.ts`, `mod.rs`, `main.go`) — infer from README or common conventions. Fetch up to **3 files**, **200 lines each**.
6. Save concatenated content.

### Branch C — Local repo

1. Verify the path: `test -d <path>` or `ls <path>/README.md`.
2. Read `README.md` (or `README.rst`) at the repo root.
3. Discover docs:
   ```bash
   find <path> -name "*.md" \( -path "*/docs/*" -o -path "*/documentation/*" \) | head -20
   ```
   Read each file, skipping any over 500 lines.
4. Read entry-point source files (same convention as Branch B) — up to **3 files**, **200 lines each**.
5. Save concatenated content.

---

## Step 3: Synthesize the Note

Read the combined raw content and create the wiki note at `$OBSIDIAN_VAULT/02_Wiki/Tech/<package-slug>/<topic-slug>.md`.

**AI framework detection (runs before choosing template):**

Detect if this is an AI/LLM framework. Triggers:
- Explicit names: LangChain, LlamaIndex, LangGraph, CrewAI, AutoGen, Haystack, OpenAI Agents SDK, Anthropic SDK, Google ADK, Vercel AI SDK, DSPy, Instructor, LiteLLM
- Any package whose README prominently features: LLM / agent / RAG / embedding pipeline / tool use / structured output

If detected: write the standard template sections first, then append four extra sections at the end:

### ## Core Pattern
Minimal runnable snippet for the primary system type (chain, agent, RAG pipeline, etc.) from the fetched docs. Mark `[ASSUMED]` for any part not present in the fetched content.

### ## Structured Output
How this framework integrates Pydantic or equivalent. Include the framework-specific method (e.g. `.with_structured_output()`, `instructor`, `PydanticOutputParser`, `response_format`).

### ## Async Notes
The single most common async mistake for this framework, in 2–3 sentences.

### ## Context Window Strategy
How the framework handles context exceeding the model's window — one paragraph.

The template differs by note type:

---

### Template A — Overview (`<package-slug>-overview.md`)

Use when this is the first note for a package/technology.

```markdown
---
aliases: [{4-6 key terms, type names, or common abbreviations}]
tags: [#type/tech_ref, #topic/{technology-or-language-name}]
---
**Parent MOC:** [[Tech-MOC]]
**Package:** [[{package-slug}/{package-slug}-overview]]
**Source:** {URLs fetched, or "Local: <path>", or "GitHub: <owner>/<repo>"}

## What It Is
{2-3 sentences: what this package/library/technology does, what problem it solves, and when you'd reach for it.}

## Installation & Setup
{How to install and minimally configure. Include package manager command, any required env vars or config files. Omit if not available from source.}

## Entry Point & Quick Start
{The first 10–20 lines a developer would write when starting a new project with this package. Concrete, runnable code. Explain each line if non-obvious.}

## Core Types & Data Structures
{Key types, structs, interfaces — each with a 1-sentence explanation and a link to its deep-dive note once created.}
* **`TypeName`**: {what it represents} → [[TypeName]]

## Key Functions & API
{The most important top-level functions or methods. Include signature and 1-line purpose.}
* **`FuncName(args) return`**: {what it does} → [[FuncName]]

## Common Patterns
{2-4 representative usage patterns with minimal code snippets.}

### Pattern: {Name}
```{language}
// minimal example
```

## Project Structure (if repo source)
{Top-level directory layout and what each part does. Only include if source is a GitHub or local repo and the structure is non-trivial.}

## Gotchas & Pitfalls
{Non-obvious behavior or common mistakes found in the docs. Only include real ones — don't invent.}
* **{Pitfall}**: {why it bites you and how to avoid it}

## Deep Dives
{Leave blank initially — populated as /vibe:learn deep-dive notes are added to this package.}

## Related Notes
{Leave blank — link_related.py will populate this section.}
```

---

### Template B — Deep Dive (`<topic-slug>.md`)

Use when the package overview already exists and the user is drilling into a specific symbol or concept.

```markdown
---
aliases: [{the symbol name, common abbreviations, related terms}]
tags: [#type/tech_ref, #topic/{technology-or-language-name}]
---
**Parent MOC:** [[Tech-MOC]]
**Package:** [[{package-slug}/{package-slug}-overview]]
**Source:** {URLs or repo identifier}

## Signature
```{language}
{Full function/type/method signature(s)}
```

## What It Does
{1-3 sentences on purpose and when to use this specific symbol.}

## Parameters & Return Values
{Only if non-obvious. Skip for zero-arg or trivially named params.}
* **`param`** (`type`): {what it expects and any constraints}
* **Returns** (`type`): {what it gives back and under what conditions}

## Behavior & Semantics
{The precise rules: edge cases, nil behavior, panics, concurrency safety, etc. Derived directly from docs.}

## Usage Examples
{2-4 minimal, runnable examples covering common cases and at least one edge case.}

```{language}
// example with comment on what it demonstrates
```

## Gotchas & Pitfalls
{Surprising behaviors or common misuse patterns specific to this symbol.}
* **{Pitfall}**: {explanation}

## Related Symbols
{Wikilinks to other notes in the same package that are closely related.}
* [[{sibling-note}]]

## Related Notes
{Leave blank — link_related.py will populate this section.}
```

---

**After creating the note**, if this was an **overview run**, also ensure `## Deep Dives` is present (empty list is fine).

If this was a **deep-dive run**, append the new note as a bullet under `## Deep Dives` in the package's `<package-slug>-overview.md`:
```
* [[{topic-slug}]]
```

---

## Step 4: Bookkeeping & RAG Update

1. Append to `$OBSIDIAN_VAULT/index.md`:
   `02_Wiki/Tech/<package-slug>/<topic-slug>.md — {1-sentence description}`

2. Append to `$OBSIDIAN_VAULT/log.md`:
   `[{ISO timestamp}] learn: created 02_Wiki/Tech/<package-slug>/<topic-slug>.md (source: {github|local|web})`

3. Run `qmd embed` to index the new note immediately.

---

## Step 5: Cross-Package Link Injection

```bash
"$OBSIDIAN_VAULT/.venv/bin/python3" "$OBSIDIAN_VAULT/scripts/link_related.py" "$OBSIDIAN_VAULT/02_Wiki/Tech/<package-slug>/<topic-slug>.md"
```

Strips any existing `## Related Notes` section, queries QMD for cross-vault semantically related raw sources, and appends a `## Related Notes` section with up to 5 wikilinks and blockquoted snippets.

---

## Step 6: No MOC file needed

`[[Tech-MOC]]` references in wiki notes are intentional ghost links — MOCs in this vault do not have actual files. Do not create `Tech-MOC.md` or any other MOC file.
