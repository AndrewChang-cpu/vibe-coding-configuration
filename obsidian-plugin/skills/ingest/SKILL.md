---
name: vibe:ingest
description: Runs the Class-to-Vault pipeline. Converts a given PDF or directory using Marker, then synthesizes the raw Markdown into a formatted Study Guide in the 02_Wiki directory.
---

# Ingestion Pipeline Instructions

When the user invokes this skill with a target file or directory, execute the following steps.

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

## Step 1: Conversion
Use your terminal access to run the appropriate Marker command on the target.
- If the target is a single file, run: `marker_single <target> "$OBSIDIAN_VAULT/01_Raw_Sources1/MDs/"`
- If the target is a directory, run: `marker <target> "$OBSIDIAN_VAULT/01_Raw_Sources1/MDs/"`

## Step 2: Synthesis & Template Application
Read the newly generated raw Markdown files in `$OBSIDIAN_VAULT/01_Raw_Sources1/MDs/`. For EACH file, create a corresponding "Study Guide" note in the `$OBSIDIAN_VAULT/02_Wiki/` directory.

You MUST strictly use the following Markdown template for every generated note. Do not deviate:

---
aliases: [{extract 4-6 key terms, comma-separated}]
tags: [#type/study_guide, #topic/{infer_from_content}]
---
**Parent MOC:** [[{Relevant_MOC_Name}]]
**Raw Source:** [[{stem}/{stem}]]

## Executive Summary
{A concise 2-3 sentence high-level overview of the document.}

## Core Concepts
* **{Concept 1}**: {Definition or explanation}
* **{Concept 2}**: {Definition or explanation}

## Important Formulas / Logic (If applicable)
{Extract any critical formulas. If none, omit.}

## Step 3: RAG Update
Execute `qmd embed` to update the vector database so new files are immediately searchable. Also run `qmd embed -c MDs` to keep the raw-sources-only collection in sync.

## Step 4: Cross-Course Link Injection & Rename
After embedding, run the link pipeline on the newly created wiki notes:

```bash
"$OBSIDIAN_VAULT/.venv/bin/python3" "$OBSIDIAN_VAULT/scripts/link_related.py" "$OBSIDIAN_VAULT/02_Wiki/<note1>.md" "$OBSIDIAN_VAULT/02_Wiki/<note2>.md" ...
```

Pass only the notes created in this ingestion run (not the entire vault), each as an absolute path. The script will:
- Strip any existing ## See Also or ## Related Notes sections
- Query QMD for semantically related raw source chunks from **other courses only**
- Append a `## Related Notes` section with up to 5 cross-course `[[wikilinks]]` and blockquoted snippets from the matched chunks
## Step 5: MOC Creation / Update

The MOC file lives at `$OBSIDIAN_VAULT/04_Resources/MOC/{Relevant_MOC_Name}.md` (e.g. `17-635 Software Architectures MOC.md`).

- **If the file does not exist**, create it using this template:

```markdown
---
tags: [#type/moc, #topic/{infer_from_course}]
---
# {Course Name} MOC

## Notes
- [[{wiki-note-stem}]] — {1-sentence description}
```

- **If the file already exists**, append each new note as a bullet under `## Notes`:
```
- [[{wiki-note-stem}]] — {1-sentence description}
```

Use the wiki note's stem (filename without `.md`) as the wikilink — not the full path.

## Step 6: Bookkeeping
1. Append each new wiki file's path and a 1-sentence description to `$OBSIDIAN_VAULT/index.md`.
2. Log the completion of this batch operation with a timestamp in `$OBSIDIAN_VAULT/log.md`.
