#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$CopilotHome = Join-Path $HOME ".copilot"
$SkillDest = Join-Path $CopilotHome "skills\diamond-workflow"
$ExtDest = Join-Path $CopilotHome "extensions\diamond-workflow"

New-Item -ItemType Directory -Force -Path "$SkillDest\specs" | Out-Null
New-Item -ItemType Directory -Force -Path $ExtDest | Out-Null

Copy-Item (Join-Path $RepoRoot "skills\diamond-workflow\SKILL.md") (Join-Path $SkillDest "SKILL.md") -Force
Copy-Item (Join-Path $RepoRoot "skills\diamond-workflow\specs\graph-specs.md") (Join-Path $SkillDest "specs\graph-specs.md") -Force
Copy-Item (Join-Path $RepoRoot ".github\extensions\diamond-workflow\*.mjs") $ExtDest -Force

Write-Host "[copilot-workflow] Installed skill to: $SkillDest"
Write-Host "[copilot-workflow] Installed extension to: $ExtDest"
Write-Host "[copilot-workflow] Run '/extensions reload' or 'extensions_reload' in GitHub Copilot CLI to activate."
