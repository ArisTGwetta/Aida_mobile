# Aida Consolidation Audit

`tools/aida_consolidation_audit.py` is a **read-only** discovery/classification tool. It does not move, copy, rename, or delete scanned files.

## What It Produces

- SHA-256 exact-duplicate groups, with a transparent canonical recommendation.
- Cautious text/code near-duplicate candidates using SimHash fingerprints.
- A directory-context map, including `unique_neighbor_files`: things that were in an old Aida folder but are not exact duplicates and may need to travel with a project, story, asset set, or guideline.
- Tags such as `aida_candidate`, `aida_data_candidate`, `story_or_project_asset`, `notes_or_guidance`, `visual_asset`, `legacy_or_archive`, and `standalone_version_candidate`.
- Candidate standalone historical packages, including Awake, One, Spine, and similarly named Aida-era roots when evidence supports it.

## First Audit

Choose scan roots intentionally. Start with the active Git reconstruction and a small number of clearly Aida-related folders. Keep output outside every scanned root.

```powershell
python tools/aida_consolidation_audit.py `
  --root "C:\Users\arist\OneDrive\Documents\GitHub\Aida_mobile\AIDA_NEXT(Git)" `
  --root "C:\path\to\another\Aida\folder" `
  --reference-root "C:\Users\arist\OneDrive\Documents\GitHub\Aida_mobile\AIDA_NEXT(Git)" `
  --output "C:\Users\arist\OneDrive\Documents\GitHub\Aida_mobile\consolidation_reports\first_audit"
```

The output contains:

- `AIDA_CONSOLIDATION_REPORT.md`: a short review order.
- `aida_consolidation_audit.json`: complete evidence, including folder context.
- `aida_consolidation_inventory.csv`: sortable inventory.

## Review Rules

1. Exact duplicate means the bytes match. It does not automatically mean the noncanonical copy should be deleted.
2. Before moving any old folder, inspect its `unique_neighbor_files`; that preserves one-off story assets, notes, and guidelines that were colocated with a version.
3. Near-duplicate candidates are prompts for review, not a replacement for reading a document or comparing a code change.
4. Preserve meaningful old Aida versions as standalone archive packages rather than flattening them into the active deployment.
5. Use Git tags/releases for active code and Drive version history for changing data. Create a separate archive only after a reviewed decision.
