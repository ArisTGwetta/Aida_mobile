# Aida Project Archaeology

`tools/aida_project_archaeology.py` is the second, cognitive layer after the consolidation audit. It is read-only: it uses the audit inventory to collect source-linked evidence for important personal projects before any structural cleanup happens.

## Default Priorities

The first pass starts with:

- Ghost in the House
- Shirley Holmes
- Gemini games
- Rias
- Cristy/Christy

It reads text, JSON, and `.docx` content where possible, and records PDFs and other opaque files as metadata-only evidence. It never creates a “master memory,” alters a source, or promotes a story into Aida's active project list.

Folders named `debug`, `private`, `personal`, `hidden`, or `vault` are included in discovery. They are tagged as sensitive candidates; by default packets list their source references without copying excerpts into a new report. Use `--include-sensitive-excerpts` only when the output location is itself appropriately private.

## Run It

Use the clean audit inventory and a new output directory outside the audit folder:

```powershell
python tools\aida_project_archaeology.py `
  --inventory "C:\Users\arist\OneDrive\Documents\Aida_consolidation_reports\first_audit_clean\aida_consolidation_inventory.csv" `
  --output "C:\Users\arist\OneDrive\Documents\Aida_project_archaeology\priority_projects_v1"
```

Outputs:

- `PROJECT_ARCHAEOLOGY_REPORT.md`: evidence counts for each priority project.
- `project_registry_draft.json`: a source-linked registry draft.
- `packets\<project>.md`: excerpts and file references for focused review.

## Next Layer

After a human reviews an evidence packet, an LLM may prepare a **dossier draft** with a timeline, source-backed summary, important entities, contradictions, open threads, and a recommended archive status. The raw source files remain untouched and authoritative.
