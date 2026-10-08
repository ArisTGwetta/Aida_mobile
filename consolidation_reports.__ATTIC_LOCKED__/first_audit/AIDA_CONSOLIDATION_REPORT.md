# Aida Consolidation Audit

Generated: 2026-08-02T16:24:17.233199+00:00
Mode: read_only_inventory (the auditor never modifies scanned files)

## Summary

- Files scanned: 1188
- Likely Aida files: 863
- Exact duplicate groups: 204
- Near-duplicate pairs: 692
- Directories with context: 50

## Review Order

1. Review exact-duplicate groups and their recommended canonical path.
2. Read each directory's `unique_neighbor_files` before moving an old folder; those are the things that may belong with the project even though they are not duplicates.
3. Review near-duplicate pairs manually. Fingerprints are evidence, not proof of interchangeable content.
4. Decide whether candidate Awake, One, Spine, or other versions should become standalone archive packages.
5. Archive only after human approval; this report contains no destructive action.

See `aida_consolidation_audit.json` for complete evidence and `aida_consolidation_inventory.csv` for filtering/sorting.
