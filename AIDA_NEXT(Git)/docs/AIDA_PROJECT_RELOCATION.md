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
