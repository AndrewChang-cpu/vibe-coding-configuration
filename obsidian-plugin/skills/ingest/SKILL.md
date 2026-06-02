---
name: vibe:ingest
description: Runs the Class-to-Vault pipeline. Converts a given PDF or directory using Marker, then synthesizes the raw Markdown into a formatted Study Guide in the 02_Wiki directory.
allowed-tools:
  - "*"
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

The `--output_dir` must **mirror the PDF's parent directory**, replacing `PDFs` with `MDs` in the path. For example, if the PDF lives at:
```
$OBSIDIAN_VAULT/01_Raw_Sources/PDFs/Textbooks/Clean Code/
```
then `--output_dir` should be:
```
$OBSIDIAN_VAULT/01_Raw_Sources/MDs/Textbooks/Clean Code/
```

Marker will create a subdirectory named after the PDF file inside that path, giving the correct mirrored structure.

- If the target is a single file, run: `marker_single <target> --output_dir "<mirrored-MDs-parent-dir>"`
- If the target is a directory, run: `marker <target> --output_dir "<mirrored-MDs-parent-dir>"`

Note: `marker` takes the output path via `--output_dir`, not as a positional argument.

## Step 1b: Verify & Retry Failed Conversions
After the batch run, check that each expected output directory actually contains a `.md` file:

```bash
for dir in "$OBSIDIAN_VAULT/01_Raw_Sources/MDs/"/*/; do
  if ! ls "$dir"*.md &>/dev/null; then
    echo "FAILED (empty): $dir"
  fi
done
```

For any empty directories, retry with CPU forced (fixes a MPS backend crash on Apple Silicon where surya's layout model throws `torch.AcceleratorError: index 8192 is out of bounds`):

```bash
TORCH_DEVICE=cpu marker_single "<original_pdf_path>" --output_dir "$OBSIDIAN_VAULT/01_Raw_Sources/MDs/"
```

Repeat until all output directories contain at least one `.md` file before proceeding.

## Step 2: Synthesis & Template Application

**IMPORTANT: Do NOT read raw Markdown files or write notes directly in this context.** Reading many large source files into the main context will exhaust the context window and cause hallucinated output.

Instead, for each raw MD file produced in Step 1, **spawn a subagent** (using the Agent tool) to handle the read + write cycle. The subagent reads the source, synthesizes the note, and writes the file — none of that content accumulates here.

**Batching rules:**
- Files ≤ 300 lines: batch up to 5 per agent
- Files 300–800 lines: batch up to 3 per agent
- Files > 800 lines: one file per agent

**Agent prompt template** (fill in the bracketed values for each batch):

> Read the following raw Markdown file(s): [list of absolute paths]. For each file, write a Study Guide note to [wiki output path] using EXACTLY this template — do not deviate from section names or structure:
>
> ```
> ---
> aliases: [{extract 4-6 key terms, comma-separated}]
> tags: [#type/study_guide, #topic/{infer_from_content}]
> ---
> **Parent MOC:** [[{Relevant_MOC_Name}]]
> **Raw Source:** [[{stem}/{stem}]]
>
> ## Executive Summary
> {A concise 2-3 sentence high-level overview of the document.}
>
> ## Core Concepts
> * **{Concept 1}**: {Definition or explanation}
> * **{Concept 2}**: {Definition or explanation}
>
> ## Important Formulas / Logic (If applicable)
> {Extract any critical formulas. If none, omit.}
> ```
>
> **CRITICAL — Section names are exact strings required by downstream scripts:**
> - The overview section MUST be named `## Executive Summary`. Do NOT rename it to `## Overview`, `## Summary`, or anything else. The cross-linking pipeline (`link_related.py`) queries QMD using the text under this exact heading — a different name produces empty cross-links.
>
> **CRITICAL — Image links must use the full vault-relative path:**
> - When the source MD references images (e.g. `_page_33_Picture_4.jpeg`), write them as `![[01_Raw_Sources/MDs/{source-dir-name}/_page_33_Picture_4.jpeg]]` using the full path from the vault root. Do NOT use bare filenames — the same filename can exist in multiple course directories and Obsidian will resolve it to the wrong file.
>
> Write each output file directly — do not return the note content in your response.

Launch batches in parallel where possible. Wait for all agents to complete before proceeding to Step 3.

## Step 3: RAG Update
Run `qmd update` first to register new files, then `qmd embed` to generate their vectors. `qmd embed` alone is a no-op for files that aren't yet registered — always run `update` first:

```bash
cd "$OBSIDIAN_VAULT" && qmd update && qmd embed && qmd embed -c MDs
```

`qmd embed` covers the main `andrew-obsidian` collection; `qmd embed -c MDs` keeps the raw-sources-only collection in sync.

Verify the new files were picked up by checking that the collection file count increased (visible in `qmd collection list` output).

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
