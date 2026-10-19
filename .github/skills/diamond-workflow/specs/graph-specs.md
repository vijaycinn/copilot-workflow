# Diamond Workflow — Graph Specifications (`specs/graph-specs.md`)

Coalesced specification catalog for the 6 Kopadze `▸ GRAPH SPEC` multi-agent topologies supported by `diamond-workflow` and the `diamond-engine` Copilot SDK workflow extension.

---

## Coalesced Specification Table

| Spec ID | Topology | Wave 1 Fan-Out (`units`) | Plain-Code Reduce & Count Guard | Verifier Gate (Fresh Context) | Human Gate (`ctx.pause`) | Wave 2 / Loop Termination | Hard Cap |
|---|---|---|---|---|---|---|---|
| `route-audit` | `diamond` | 1 worker per route/handler file (`Vijay Agent`) | Dedupe by `file:line` + signature; quorum `>= ceil(N/2)`; log `null` files | 1 fresh `code-review` / `rubber-duck` verifier checking exploitability & line accuracy | Optional (`pauseAtGate`) | Single synthesis (`REPORT_SCHEMA`) with explicit `missingUnits` section | `maxUnits: 20` |
| `research-desk` | `diamond` | 5 orthogonal research angles (`Vijay Agent`) | Dedupe normalized claim keys; drop uncited entries; quorum `>= 3/5` | 3 parallel `rubber-duck` skeptics (`correct`, `current`, `real_source`); majority vote `>= 2/3` | `pauseAtGate: true` (`approve-synthesis-v1`) | Layered fan-in if `survivors > batchSize` (40), then final synthesis | `maxTotalSubagents: 30` |
| `content-brief` | `diamond` | 3 parallel jobs: `coverage`, `real_questions`, `gaps` | Dedupe claims; separate sourced vs unsourced claims; quorum `>= 2/3` | 1 fresh fact-checker (`rubber-duck`) flagging unsourced claims (`real_source`) | Optional (`pauseAtGate`) | Synthesize executive brief with verified citations and flagged gaps | `maxTotalSubagents: 12` |
| `gtm-kit` | `double-diamond` | Wave 1: 3 research jobs (`icp_pain`, `competitor_matrix`, `proof_points`) | Wave 1 reduce + quorum `>= 2/3` -> journal `positioning-doc-v1` | Wave 1: `rubber-duck` positioning check; Wave 2: alignment verifier against `positioning-doc-v1` | Mandatory mid-graph `ctx.pause("approve-positioning-v1")` | Wave 2: 3 parallel asset writers (`pitch_deck`, `battlecard`, `outbound_email`) | `maxTotalSubagents: 24` |
| `refactor-sweep` | `diamond` | 1 worker per file with functions over 100 lines (isolated git worktree recipe) | Count guard report (`returnedUnits` vs `missingUnits`); quorum `>= ceil(N/2)` | Fresh critic (`rubber-duck` / `code-review`) verifying behavior preservation & diff hygiene | Optional (`pauseAtGate`) | Consolidated refactor ledger + worktree merge commands | `maxUnits: 50` |
| `discovery-loop` | `cyclic-loop` | `findersPerRound` (default 3) parallel finders per round (`finder:r${round}:${i}`) | Cumulative `seen` claim-key Set across rounds; count new verified findings per round | Fresh `rubber-duck` verifier per candidate finding (`correct`, `real_source`) | Optional (`pauseAtGate`) | Stop when `emptyRounds >= 2` (2 consecutive rounds with 0 new verified findings) or `maxRounds` (5) | `maxTotalSubagents: 24` |

---

## Per-Spec Parameter Definitions

### 1. `route-audit` (`▸ GRAPH SPEC: Route Audit`)

- **Topology:** `"diamond"`
- **Intent:** Security, validation, and error-handling audit across API route or controller files.
- **Default Parameters:**
  - `specId`: `"route-audit"`
  - `topology`: `"diamond"`
  - `units`: Array of up to 20 file paths (1 worker per file, label `worker:w1:${i}`).
  - `verifierLenses`: `["correct"]` (checks `file:line` accuracy, auth/input-validation correctness, and false-positive elimination).
  - `pauseAtGate`: `false`
  - `maxUnits`: `20`
- **Count Guard Rule:** Any worker returning `null` is recorded in `missingUnits` and surfaced as an explicit `Unverified Files` warning in the final report. Halts if `< ceil(units.length / 2)` workers return valid structured findings.

---

### 2. `research-desk` (`▸ GRAPH SPEC: Research Desk`)

- **Topology:** `"diamond"`
- **Intent:** High-rigor technical, architectural, or competitive research across 5 orthogonal angles.
- **Default Parameters:**
  - `specId`: `"research-desk"`
  - `topology`: `"diamond"`
  - `units` (default 5 angles when caller supplies only `goal`):
    1. `"What changed in the last 6 months (releases, GA/preview shifts, deprecations)"`
    2. `"How it works in production (architecture, throughput, scaling limits)"`
    3. `"What breaks (failure modes, quotas, operational gotchas, regional gaps)"`
    4. `"Competitor and alternative approaches (trade-offs, migration friction)"`
    5. `"Economics, pricing mechanics, and governance/compliance impact"`
  - `verifierLenses`: `["correct", "current", "real_source"]` (3 parallel `rubber-duck` skeptics per claim; claim survives only if `>= 2/3` vote `pass: true`).
  - `pauseAtGate`: `true` (pauses at `approve-synthesis-v1` when enabled).
  - `batchSize`: `40`

---

### 3. `content-brief` (`▸ GRAPH SPEC: Content Brief`)

- **Topology:** `"diamond"`
- **Intent:** Build an evidence-backed content or executive brief without generic filler.
- **Default Parameters:**
  - `specId`: `"content-brief"`
  - `topology`: `"diamond"`
  - `units` (3 parallel jobs):
    1. `"coverage: Top existing explanations, official docs, and canonical reference architectures"`
    2. `"real_questions: Practitioner pain points, recurring objections, and unresolved edge cases"`
    3. `"gaps: What existing coverage gets wrong, omits, or leaves unquantified"`
  - `verifierLenses`: `["real_source"]` (fact-checker verifier that flags and strips unsourced claims).
  - `pauseAtGate`: `false`

---

### 4. `gtm-kit` (`▸ GRAPH SPEC: GTM Kit — Double-Diamond`)

- **Topology:** `"double-diamond"`
- **Intent:** Two-wave Go-To-Market package where customer positioning is locked and human-approved before asset generation.
- **Default Parameters:**
  - `specId`: `"gtm-kit"`
  - `topology`: `"double-diamond"`
  - `units` (Wave 1 — 3 research jobs):
    1. `"icp_pain: Target persona pain points, quantification, and buying triggers"`
    2. `"competitor_matrix: Competitive alternatives, landmines, and defensible differentiators"`
    3. `"proof_points: Verifiable customer evidence, benchmarks, and technical proof"`
  - **Mid-Graph Gate:**
    1. Synthesize and journal `positioning-doc-v1` via `ctx.step("positioning-doc-v1", ...)`.
    2. Call `await ctx.pause("approve-positioning-v1")`. On resume, `positioning-doc-v1` replays from journal with zero duplicate Wave 1 subagent calls.
  - `secondaryUnits` (Wave 2 — 3 parallel asset writers consuming `positioning-doc-v1`):
    1. `"pitch_deck: 5-slide executive narrative and architecture spine"`
    2. `"battlecard: Objection-handling and competitive counter-play card"`
    3. `"outbound_email: BLUF customer follow-up draft"`
  - **Wave 2 Verifier:** Fresh alignment verifier checking that all 3 assets strictly match `positioning-doc-v1` without contradicted or fabricated claims.

---

### 5. `refactor-sweep` (`▸ GRAPH SPEC: Refactor Sweep`)

- **Topology:** `"diamond"`
- **Intent:** Large-scale code refactoring across up to 50 files containing functions > 100 lines.
- **Default Parameters:**
  - `specId`: `"refactor-sweep"`
  - `topology`: `"diamond"`
  - `units`: Up to 50 target files (1 worker per file, label `worker:w1:${i}`).
  - `verifierLenses`: `["correct"]` (fresh critic checking signature preservation, complexity reduction, and test safety).
  - `maxUnits`: `50`
- **Git Worktree Isolation Recipe (when executing code edits):**
  - Each worker operates on an isolated worktree or disjoint file slice (`git worktree add ../wt-worker-${i} -b refactor/unit-${i}`) so parallel workers never contend on `.git/index.lock`.
  - `COPILOT_FREEZE_TESTS=1` hook blocks any worker from modifying test, benchmark, eval, or `.github/hooks` files.
  - Fan-in count guard verifies `returnedUnits` vs `missingUnits` before merging.

---

### 6. `discovery-loop` (`▸ GRAPH SPEC: Discovery Loop — Cyclic`)

- **Topology:** `"cyclic-loop"`
- **Intent:** Open-ended bug, security vulnerability, or edge-case discovery where the total number of findings is unknown upfront.
- **Default Parameters:**
  - `specId`: `"discovery-loop"`
  - `topology`: `"cyclic-loop"`
  - `findersPerRound`: `3` (spawned in parallel with round-scoped labels `finder:r${round}:${i}`, passing already-discovered claim keys as exclusions).
  - `maxRounds`: `5`
  - `verifierLenses`: `["correct", "real_source"]`
  - `maxTotalSubagents`: `24`
- **Termination Rule:**
  - Maintain a cumulative `seen` Set of normalized claim keys across rounds.
  - After plain-code deduplication against `seen` and fresh-context verification, count `newVerified.length`.
  - If `newVerified.length === 0`, increment `emptyRounds`; otherwise reset `emptyRounds = 0`.
  - Exit the loop immediately when `emptyRounds >= 2` (2 consecutive rounds with 0 new verified findings) or `round >= maxRounds`.
