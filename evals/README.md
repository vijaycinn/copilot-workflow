# Graph Engineering Evaluation & Benchmark Suite

Quantitative evaluation and benchmark suite verifying the 7 core architectural guarantees of the **Graph Engineering** harness for GitHub Copilot CLI (`copilot-workflow`).

## Quick Start

Zero external npm packages are required (uses Node.js built-ins only).

```powershell
node evals/run-evals.mjs
# or via npm:
npm run eval
```

Running `run-evals.mjs` prints a console scorecard and writes machine-readable and human-readable artifacts to:

- `evals/results/eval-scorecard.json`
- `evals/results/eval-report.md`

---

## The 7 Graph Engineering Evals

| # | Eval ID | Architectural Principle Tested | Methodology | Target Proof |
|---|---------|--------------------------------|-------------|--------------|
| 1 | `fake-edge-speedup` | **Eliminate Fake Sequential Edges** | Simulates a 12-unit workload with only 3 true dependency layers. Compares sequential chain (`u1 -> ... -> u12`) against Diamond parallel fan-out (`Promise.all` per layer). | **4.00x speedup** (`12,000 ms` -> `3,000 ms`, `-75.0%` latency; critical-path depth `12` -> `3`). |
| 2 | `fan-in-count-guard` | **Explicit Fan-In Count & Quorum Guard** | Tests 5 worker failure rates (`0%`, `20%`, `50%`, `60%`, `100%` across 10 workers) comparing `guardFanIn` against naive `results.filter(Boolean)`. | **100% silent-failure prevention** vs `0%` in naive `filter(Boolean)`. Flags `missingUnits > 0` on partial failures and fails closed below `ceil(N/2)`. |
| 3 | `three-skeptic-verifier` | **3-Skeptic Fresh-Context Majority Vote** | Evaluates 20 labeled synthetic findings (`10` valid grounded claims, `4` logic/overgeneralization errors, `3` stale/superseded claims, `3` fabricated/broken-source claims) across `correct`, `current`, and `real_source` lenses (`>= 2/3` keep) vs. a same-context self-grading loop. | **100.0% Precision, 100.0% Recall, 1.000 F1, 100.0% FP filtering** vs `55.6%` Precision / `20.0%` FP filtering in self-grading loop. |
| 4 | `context-collapse-layered-fanin` | **Layered Fan-In (`chunk(40)`)** | Simulates 160 verified claims (`80,000` chars / `20,000` tokens) entering synthesis. Compares single-step flat fan-in against 2-tier `chunkArray(160, 40)` group-merger synthesis. | **78.0% peak context reduction** (`80,000` chars -> `17,600` chars; `20,000` -> `4,400` tokens) with **100% citation retention**. |
| 5 | `durable-checkpoint-replay` | **Durable `ctx.step` & `ctx.pause` Replay** | Simulates pausing `double-diamond` at `approve-positioning-v1` (after 9 Wave 1 subagents / `32,000` tokens) and resuming via journaled checkpoint. | **0 Wave 1 subagents re-run on resume** (**100.0% token savings** on replayed stages; `32,000` tokens saved). |
| 6 | `cyclic-loop-convergence` | **Unknown-Size Discovery Convergence** | Simulates a multi-round bug hunt (`R1: 6 new`, `R2: 2 new + 3 dup`, `R3: 0 new + 2 dup`, `R4: 0 new`) with `maxRounds = 8` and `convergenceZeroRounds = 2`, plus a non-converging hard-cap test. | **100% exact deduplication** (`8` unique, `5` duplicates filtered) and automatic termination after **Round 4** (**50% round budget saved**). |
| 7 | `hook-anchor-and-el-mds-stacking` | **Frozen-Rule Hooks & `el-mds` Stacking** | Tests 12 scenarios across `onPreToolUse`, `onSubagentStart`, and `onSubagentStop` with `COPILOT_FREEZE_TESTS=1`. | **100% block rate** on frozen paths (`tests/*.test.js`, `benchmark/*`, `evals/*`, `.github/hooks/*`), **100% allow rate** on `src/*`, **100% abstain (`undefined`)** on `task`/`run_dynamic_workflow`, and **100% block rate** on uncited `research` outputs. |

## Files

- `run-evals.mjs` — CLI runner that executes all 7 scenarios, verifies assertions, prints the console table, and writes `results/eval-scorecard.json` and `results/eval-report.md`.
- `scenarios.mjs` — Self-contained benchmark scenarios and reference Graph Engineering primitives (`chunkArray`, `guardFanIn`, 3-skeptic majority voter, durable checkpoint journal, cyclic deduplicator, and hook evaluators).
- `results/eval-scorecard.json` — Machine-readable scorecard output.
- `results/eval-report.md` — Formatted Markdown report of all 7 benchmarks and assertions.
