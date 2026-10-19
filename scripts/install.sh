#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COPILOT_HOME="${HOME}/.copilot"
SKILL_DEST="${COPILOT_HOME}/skills/diamond-workflow"
EXT_DEST="${COPILOT_HOME}/extensions/diamond-workflow"

mkdir -p "${SKILL_DEST}/specs"
mkdir -p "${EXT_DEST}"

cp -f "${REPO_ROOT}/skills/diamond-workflow/SKILL.md" "${SKILL_DEST}/SKILL.md"
cp -f "${REPO_ROOT}/skills/diamond-workflow/specs/graph-specs.md" "${SKILL_DEST}/specs/graph-specs.md"
cp -f "${REPO_ROOT}/.github/extensions/diamond-workflow/"*.mjs "${EXT_DEST}/"

echo "[copilot-workflow] Installed skill to: ${SKILL_DEST}"
echo "[copilot-workflow] Installed extension to: ${EXT_DEST}"
echo "[copilot-workflow] Run '/extensions reload' or 'extensions_reload' in GitHub Copilot CLI to activate."
