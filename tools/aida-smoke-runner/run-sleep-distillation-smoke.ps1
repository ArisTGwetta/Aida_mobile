param(
  [string]$NodePath = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runner = Join-Path $ScriptDir "sleep-distillation-smoke.cjs"

if (-not (Test-Path -LiteralPath $Runner)) {
  throw "Missing smoke runner: $Runner"
}

$Candidates = @()
if ($NodePath) {
  $Candidates += $NodePath
}

$BundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Candidates += $BundledNode

$CommandNode = Get-Command node -ErrorAction SilentlyContinue
if ($CommandNode) {
  $Candidates += $CommandNode.Source
}

$Node = $Candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $Node) {
  throw "Could not find node.exe. Install Node.js or pass -NodePath C:\path\to\node.exe"
}

Write-Host "Using Node: $Node"
& $Node $Runner
exit $LASTEXITCODE
