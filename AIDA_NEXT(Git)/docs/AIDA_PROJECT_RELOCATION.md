# Aida Project Relocation

`tools/aida_project_move_manifest.py` prepares a source-hashed, dry-run-only plan for relocating one explicitly approved project edition into its canonical Aida Drive location.

It never changes source files, creates the target folder, or copies/moves/deletes anything. The output is a human-review artifact and a future apply executor's verification contract.

## Run It

```powershell
python tools\aida_project_move_manifest.py `
  --source "C:\Users\arist\OneDrive\Desktop\Dad\Shirley Homes and Watson\v2" `
  --target "G:\My Drive\AIDA_ONE\AIDA_next-GD\projects\shirley_holmes\case_01_the_smiling_pumpkins\v2_current_draft" `
  --project "shirley_holmes.case_01.smiling_pumpkins.v2" `
  --output "C:\Users\arist\OneDrive\Documents\Aida_project_archaeology\priority_projects_with_dad_v2\move_manifests"
```

Review the generated JSON and Markdown before requesting an apply executor. An approved move must re-hash sources, verify every target file, and require a separate explicit confirmation before the source is removed.

## Stage And Finalize

`tools/aida_project_relocation_executor.py` carries out the two deliberately separate phases:

```powershell
python tools\aida_project_relocation_executor.py `
  --manifest "C:\Users\arist\OneDrive\Documents\Aida_project_archaeology\priority_projects_with_dad_v2\move_manifests\shirley_holmes_case_01_smiling_pumpkins_v2_move_manifest_dry_run.json" `
  --stage
```

`--stage` copies only after every source matches the dry-run hash, verifies every destination hash, and writes a verification report. It never deletes a source.

## Delete Moratorium

After a successful stage, use `--quarantine` to rename the original source folder into a clearly dated, non-working review copy:

```powershell
python tools\aida_project_relocation_executor.py `
  --manifest "...move_manifest_dry_run.json" `
  --quarantine `
  --delete-not-before "2026-11-01"
```

The quarantined source remains intact. At expiry, the owner may either snooze the date or approve finalization. `--finalize` requires the moratorium report, checks that the date has passed, re-verifies all source and destination hashes, refuses to remove unmanifested files, and still requires a new explicit approval.
