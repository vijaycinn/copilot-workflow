# Graph Engineering Evaluation & Benchmark Scorecard

- **Generated**: `2026-10-19T17:33:12.768Z`
- **Total Evals**: `7/7` passed (`100%`)
- **Total Assertions**: `33/33` green (`100%`)
- **Suite Execution Time**: `278.77 ms`

## Executive Scorecard

| # | Eval ID | Status | Assertions | Baseline | Graph Engineering | Key Quantitative Proof |
|---|---------|--------|------------|----------|-------------------|------------------------|
| 1 | `fake-edge-speedup` | **PASS** | 5/5 | 12000 ms (depth 12, sequential fake edges) | 3000 ms (depth 3, Diamond fan-out) | **4.00x speedup (-75% latency)** |
| 2 | `fan-in-count-guard` | **PASS** | 6/6 | 0.0% silent-failure detection (naive filter(Boolean) synthesizes on 40% or 0% data) | 100.0% detection & quorum enforcement (flags partial >=50%, fails closed <ceil(N/2)) | **+100.0 percentage points silent-failure prevention** |
| 3 | `three-skeptic-verifier` | **PASS** | 5/5 | Precision 55.6%, F1 71.4%, FP Filter 20% (Self-Grading Loop) | Precision 100%, F1 100%, FP Filter 100% (3-Skeptic Majority Vote) | **+80.0% false-positive filtering, +28.6% F1** |
| 4 | `context-collapse-layered-fanin` | **PASS** | 4/4 | 80,000 chars / 20,000 tokens (flat 160-claim fan-in) | 17,600 chars / 4,400 tokens (chunk(40) layered fan-in) | **-78% peak synthesizer prompt size (100% citation retention)** |
| 5 | `durable-checkpoint-replay` | **PASS** | 4/4 | 9 Wave 1 agents re-run / 32,000 tokens wasted on restart after human review | 0 Wave 1 agents re-run / 0 tokens wasted on resume (ctx.step + ctx.pause journal) | **100.0% token & subagent savings on replayed stages (32,000 tokens saved)** |
| 6 | `cyclic-loop-convergence` | **PASS** | 4/4 | Runs all 8 rounds with 5 duplicate bug reports (unbounded or fixed-round loop) | Terminates at Round 4 with 8/8 unique bugs & 0 duplicates (2-zero-round convergence) | **50.0% round budget saved, 100.0% duplicate elimination** |
| 7 | `hook-anchor-and-el-mds-stacking` | **PASS** | 5/5 | Prompt-only instructions drift after compaction; naive 'allow' hooks override el-mds | 100% frozen-path block, 100% src/* allow, 100% el-mds abstain, 100% uncited research block | **Deterministic invariant enforcement outside LLM context window** |

## Detailed Eval Breakdown

### Eval 1: Sequential Chain vs. Diamond Parallel Fan-Out (`fake-edge-speedup`)

- **Status**: **PASS**
- **Baseline**: 12000 ms (depth 12, sequential fake edges)
- **Graph Engineering**: 3000 ms (depth 3, Diamond fan-out)
- **Headline Improvement**: **4.00x speedup (-75% latency)**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| 12 total work units executed in both topologies | PASS | `12/12 units` | `12/12 units` |
| Critical-path depth reduced from 12 (sequential chain) to 3 (Diamond fan-out) | PASS | `seq=12, diamond=3` | `seq=12, diamond=3` |
| Simulated wall-clock latency reduced 4.0x (12,000ms -> 3,000ms, 75.0% reduction) | PASS | `12000ms -> 3000ms (4x, -75%)` | `12000ms -> 3000ms (4x, -75%)` |
| Real async Promise.all execution faster than sequential await loop | PASS | `parallel=47.16ms < sequential=196.31ms (4.16x)` | `parallel < sequential` |
| Deterministic output ordering preserved across parallel fan-in | PASS | `outputsIdentical=true` | `outputsIdentical=true` |

#### Key Metrics (JSON)

```json
{
  "totalUnits": 12,
  "trueDependencyLayers": 3,
  "sequentialSimulatedLatencyMs": 12000,
  "diamondSimulatedLatencyMs": 3000,
  "diamond1101SimulatedLatencyMs": 3000,
  "sequentialCriticalPathDepth": 12,
  "diamondCriticalPathDepth": 3,
  "speedupFactor": 4,
  "latencyReductionPct": 75,
  "sequentialRealWallClockMs": 196.31,
  "diamondRealWallClockMs": 47.16,
  "realSpeedupFactor": 4.16
}
```

### Eval 2: Silent Node Failure Detection & Quorum Guard (`fan-in-count-guard`)

- **Status**: **PASS**
- **Baseline**: 0.0% silent-failure detection (naive filter(Boolean) synthesizes on 40% or 0% data)
- **Graph Engineering**: 100.0% detection & quorum enforcement (flags partial >=50%, fails closed <ceil(N/2))
- **Headline Improvement**: **+100.0 percentage points silent-failure prevention**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| 0% failure passes cleanly with missingUnits=0 and degraded=false | PASS | `status=OK_COMPLETE, missingUnits=0` | `status=OK_COMPLETE, missingUnits=0` |
| 20% failure passes quorum (8/10 >= 5) and flags missingUnits=2 in metadata | PASS | `status=DEGRADED_PARTIAL, missingUnits=2` | `status=DEGRADED_PARTIAL, missingUnits=2` |
| 50% failure at boundary (5/10 == ceil(10/2)) passes quorum with missingUnits=5 warning | PASS | `status=DEGRADED_PARTIAL, valid=5/10, missing=5` | `status=DEGRADED_PARTIAL, valid=5/10, missing=5` |
| 60% failure (4/10 < 5) breaches quorum and fails closed before synthesis | PASS | `status=FAILED_QUORUM, aborted=true` | `status=FAILED_QUORUM, aborted=true` |
| 100% failure (0/10 < 5) breaches quorum and fails closed before synthesis | PASS | `status=FAILED_QUORUM, aborted=true` | `status=FAILED_QUORUM, aborted=true` |
| 100% silent-failure prevention across all failure scenarios vs 0% in naive filter(Boolean) | PASS | `guard=100% vs naive=0%` | `guard=100% vs naive=0%` |

#### Key Metrics (JSON)

```json
{
  "totalScenarios": 5,
  "fanOutSize": 10,
  "quorumThreshold": 5,
  "guardedSilentFailurePreventionPct": 100,
  "naiveSilentFailurePreventionPct": 0,
  "scenarioBreakdown": [
    {
      "scenario": "0% failure (10/10 valid)",
      "failureRatePct": 0,
      "validCount": 10,
      "missingUnits": 0,
      "degraded": false,
      "quorumBreached": false,
      "guardedStatus": "OK_COMPLETE",
      "naiveStatus": "OK_SYNTHESIZED"
    },
    {
      "scenario": "20% failure within quorum (8/10 valid)",
      "failureRatePct": 20,
      "validCount": 8,
      "missingUnits": 2,
      "degraded": true,
      "quorumBreached": false,
      "guardedStatus": "DEGRADED_PARTIAL",
      "naiveStatus": "OK_SYNTHESIZED"
    },
    {
      "scenario": "50% failure at quorum boundary (5/10 valid)",
      "failureRatePct": 50,
      "validCount": 5,
      "missingUnits": 5,
      "degraded": true,
      "quorumBreached": false,
      "guardedStatus": "DEGRADED_PARTIAL",
      "naiveStatus": "OK_SYNTHESIZED"
    },
    {
      "scenario": "60% failure exceeding quorum (4/10 valid)",
      "failureRatePct": 60,
      "validCount": 4,
      "missingUnits": 6,
      "degraded": true,
      "quorumBreached": true,
      "guardedStatus": "FAILED_QUORUM",
      "naiveStatus": "OK_SYNTHESIZED"
    },
    {
      "scenario": "100% failure total outage (0/10 valid)",
      "failureRatePct": 100,
      "validCount": 0,
      "missingUnits": 10,
      "degraded": true,
      "quorumBreached": true,
      "guardedStatus": "FAILED_QUORUM",
      "naiveStatus": "OK_SYNTHESIZED"
    }
  ]
}
```

### Eval 3: 3-Skeptic Fresh-Context Majority Vote vs. Self-Grading Loop (`three-skeptic-verifier`)

- **Status**: **PASS**
- **Baseline**: Precision 55.6%, F1 71.4%, FP Filter 20% (Self-Grading Loop)
- **Graph Engineering**: Precision 100%, F1 100%, FP Filter 100% (3-Skeptic Majority Vote)
- **Headline Improvement**: **+80.0% false-positive filtering, +28.6% F1**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| Dataset contains 20 labeled findings (10 valid, 4 logic, 3 stale, 3 fabricated-source) | PASS | `total=20 (10/4/3/3)` | `total=20 (10/4/3/3)` |
| 3-Skeptic Majority Vote (>=2/3) achieves 100% Precision and 100% Recall (F1 = 1.000) | PASS | `P=100%, R=100%, F1=100%` | `P=100%, R=100%, F1=100%` |
| 3-Skeptic Majority Vote filters 100% (10/10) of false positives across all 3 error lenses | PASS | `FP_Filtered=10/10 (100%)` | `FP_Filtered=10/10 (100%)` |
| Majority vote (>=2/3) preserves valid findings that receive 2/3 votes despite 1 conservative nit | PASS | `F09(2/3)->KEEP, F10(2/3)->KEEP` | `2/3 votes kept` |
| 3-Skeptic Verifier outperforms Self-Grading Loop on Precision (100% vs 55.6%) and FP filtering (100% vs 20%) | PASS | `3-Skeptic F1=100% (FP filter 100%) vs Self-Grade F1=71.4% (FP filter 20%)` | `3-Skeptic > Self-Grade` |

#### Key Metrics (JSON)

```json
{
  "datasetSize": 20,
  "validClaimsCount": 10,
  "invalidLogicCount": 4,
  "invalidStaleCount": 3,
  "invalidFabricatedSourceCount": 3,
  "threeSkeptic": {
    "tp": 10,
    "fp": 0,
    "tn": 10,
    "fn": 0,
    "precision": 1,
    "recall": 1,
    "f1": 1,
    "fpFilteringRate": 1,
    "precisionPct": 100,
    "recallPct": 100,
    "f1Pct": 100,
    "fpFilteringRatePct": 100
  },
  "selfGradingLoop": {
    "tp": 10,
    "fp": 8,
    "tn": 2,
    "fn": 0,
    "precision": 0.5556,
    "recall": 1,
    "f1": 0.7143,
    "fpFilteringRate": 0.2,
    "precisionPct": 55.6,
    "recallPct": 100,
    "f1Pct": 71.4,
    "fpFilteringRatePct": 20
  }
}
```

### Eval 4: Single-Step Fan-In vs. Layered Fan-In (chunk(40)) (`context-collapse-layered-fanin`)

- **Status**: **PASS**
- **Baseline**: 80,000 chars / 20,000 tokens (flat 160-claim fan-in)
- **Graph Engineering**: 17,600 chars / 4,400 tokens (chunk(40) layered fan-in)
- **Headline Improvement**: **-78% peak synthesizer prompt size (100% citation retention)**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| 160 verified claims total 80,000 chars (20,000 tokens) in flat fan-in | PASS | `160 claims, 80000 chars (20000 tokens)` | `160 claims, 80000 chars (20000 tokens)` |
| chunkArray(160, 40) partitions claims into 4 balanced batches of 40 | PASS | `4 chunks of [40, 40, 40, 40]` | `4 chunks of [40, 40, 40, 40]` |
| Layered fan-in reduces peak synthesizer prompt by 78.0% (80,000 -> 17,600 chars) | PASS | `80000 -> 17600 chars (-78%)` | `80000 -> 17600 chars (-78.0%)` |
| 100% of 160 claim IDs preserved across layered group digests into final synthesis | PASS | `160/160 claim IDs preserved` | `160/160 claim IDs preserved` |

#### Key Metrics (JSON)

```json
{
  "totalClaims": 160,
  "chunkSize": 40,
  "chunkCount": 4,
  "flatPeakPromptChars": 80000,
  "flatPeakPromptTokens": 20000,
  "layeredPeakPromptChars": 17600,
  "layeredPeakPromptTokens": 4400,
  "peakContextReductionPct": 78,
  "citationPreservationPct": 100
}
```

### Eval 5: ctx.step & ctx.pause Resume Efficiency (double-diamond & diamond) (`durable-checkpoint-replay`)

- **Status**: **PASS**
- **Baseline**: 9 Wave 1 agents re-run / 32,000 tokens wasted on restart after human review
- **Graph Engineering**: 0 Wave 1 agents re-run / 0 tokens wasted on resume (ctx.step + ctx.pause journal)
- **Headline Improvement**: **100.0% token & subagent savings on replayed stages (32,000 tokens saved)**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| Run 1 executes 9 Wave 1 subagents (32,000 tokens) and pauses at approve-positioning-v1 | PASS | `gate=approve-positioning-v1, wave1Agents=9, wave1Tokens=32000` | `gate=approve-positioning-v1, wave1Agents=9, wave1Tokens=32000` |
| 0 Wave 1 subagents re-run on resume (all 9 Wave 1 steps replayed from durable journal) | PASS | `wave1AgentsReRun=0, replayedSteps=9/9` | `wave1AgentsReRun=0, replayedSteps=9/9` |
| 100.0% token savings on replayed Wave 1 stages (32,000 tokens saved) | PASS | `100% saved (32000 tokens saved, 0 re-spent)` | `100% saved (32000 tokens saved, 0 re-spent)` |
| Resume executes only Wave 2 (7 subagents, 24,000 tokens) and produces final decision | PASS | `wave2Agents=7, wave2Tokens=24000, winner=Option-B` | `wave2Agents=7, wave2Tokens=24000, winner=Option-B` |

#### Key Metrics (JSON)

```json
{
  "pauseGate": "approve-positioning-v1",
  "wave1SubagentsInitial": 9,
  "wave1TokensInitial": 32000,
  "wave1SubagentsReRunOnResume": 0,
  "wave1TokensReSpentOnResume": 0,
  "replayedStageTokenSavingsPct": 100,
  "wave2SubagentsOnResume": 7,
  "wave2TokensOnResume": 24000,
  "nonCheckpointedTotalTokensIfRestarted": 88000,
  "checkpointedTotalTokensAcrossPauseResume": 56000
}
```

### Eval 6: Unknown-Size Discovery Loop Convergence & Cap Enforcement (`cyclic-loop-convergence`)

- **Status**: **PASS**
- **Baseline**: Runs all 8 rounds with 5 duplicate bug reports (unbounded or fixed-round loop)
- **Graph Engineering**: Terminates at Round 4 with 8/8 unique bugs & 0 duplicates (2-zero-round convergence)
- **Headline Improvement**: **50.0% round budget saved, 100.0% duplicate elimination**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| Per-round new issue discovery matches [6, 2, 0, 0] | PASS | `newIssues=[6,2,0,0]` | `newIssues=[6,2,0,0]` |
| Exact fingerprint deduplication filters all 5 duplicate findings (8 unique retained) | PASS | `unique=8, duplicatesSkipped=5 (R2=3, R3=2)` | `unique=8, duplicatesSkipped=5 (R2=3, R3=2)` |
| Loop converges and terminates automatically after Round 4 (2 consecutive zero-new rounds) | PASS | `roundsExecuted=4, terminatedBy=CONVERGENCE_2_ZERO_ROUNDS` | `roundsExecuted=4, terminatedBy=CONVERGENCE_2_ZERO_ROUNDS` |
| Hard-cap safety guard terminates non-converging discovery strictly at maxRounds | PASS | `capRounds=4, terminatedBy=MAX_ROUNDS_CAP` | `capRounds=4, terminatedBy=MAX_ROUNDS_CAP` |

#### Key Metrics (JSON)

```json
{
  "maxRoundsConfigured": 8,
  "roundsExecuted": 4,
  "roundsSaved": 4,
  "roundsSavedPct": 50,
  "uniqueIssuesFound": 8,
  "duplicatesFiltered": 5,
  "deduplicationAccuracyPct": 100,
  "terminatedBy": "CONVERGENCE_2_ZERO_ROUNDS",
  "roundHistory": [
    {
      "round": 1,
      "rawScanned": 6,
      "newIssues": 6,
      "duplicatesSkipped": 0,
      "cumulativeUnique": 6,
      "consecutiveZeroNew": 0
    },
    {
      "round": 2,
      "rawScanned": 5,
      "newIssues": 2,
      "duplicatesSkipped": 3,
      "cumulativeUnique": 8,
      "consecutiveZeroNew": 0
    },
    {
      "round": 3,
      "rawScanned": 2,
      "newIssues": 0,
      "duplicatesSkipped": 2,
      "cumulativeUnique": 8,
      "consecutiveZeroNew": 1
    },
    {
      "round": 4,
      "rawScanned": 0,
      "newIssues": 0,
      "duplicatesSkipped": 0,
      "cumulativeUnique": 8,
      "consecutiveZeroNew": 2
    }
  ]
}
```

### Eval 7: Frozen-Rule Hook Enforcement & el-mds Non-Interference (`hook-anchor-and-el-mds-stacking`)

- **Status**: **PASS**
- **Baseline**: Prompt-only instructions drift after compaction; naive 'allow' hooks override el-mds
- **Graph Engineering**: 100% frozen-path block, 100% src/* allow, 100% el-mds abstain, 100% uncited research block
- **Headline Improvement**: **Deterministic invariant enforcement outside LLM context window**

#### Assertions

| Assertion | Status | Actual | Expected |
|-----------|--------|--------|----------|
| All 12 hook & subagent lifecycle scenarios executed and passed | PASS | `12/12 passed` | `12/12 passed` |
| 100% block rate on edits/writes to tests/*.test.js, benchmark/*, evals/*, and .github/hooks/* | PASS | `100% (5/5 blocked)` | `100% (5/5 blocked)` |
| 100% allow rate on src/* implementation files and read-only view calls | PASS | `100% (3/3 allowed)` | `100% (3/3 allowed)` |
| 100% abstain (undefined) rate on task and run_dynamic_workflow (zero interference with el-mds) | PASS | `100% (2/2 returned undefined)` | `100% (2/2 returned undefined)` |
| 100% block rate on uncited research subagent outputs + anchor injection on start | PASS | `uncitedBlock=100%, citedAndAnchored=true` | `uncitedBlock=100%, citedAndAnchored=true` |

#### Key Metrics (JSON)

```json
{
  "totalScenarios": 12,
  "passedScenarios": 12,
  "frozenPathBlockRatePct": 100,
  "srcImplementationAllowRatePct": 100,
  "elMdsAbstainRatePct": 100,
  "uncitedResearchBlockRatePct": 100,
  "scenarios": [
    {
      "id": "S01",
      "category": "frozen_mutation",
      "hook": "onPreToolUse",
      "description": "edit tests/auth.test.js blocked when COPILOT_FREEZE_TESTS=1",
      "passed": true
    },
    {
      "id": "S02",
      "category": "frozen_mutation",
      "hook": "onPreToolUse",
      "description": "create benchmark/latency.bench.js blocked when COPILOT_FREEZE_TESTS=1",
      "passed": true
    },
    {
      "id": "S03",
      "category": "frozen_mutation",
      "hook": "onPreToolUse",
      "description": "edit evals/scenarios.mjs blocked when COPILOT_FREEZE_TESTS=1",
      "passed": true
    },
    {
      "id": "S04",
      "category": "frozen_mutation",
      "hook": "onPreToolUse",
      "description": "edit .github/hooks/freeze-tests.mjs self-tamper blocked",
      "passed": true
    },
    {
      "id": "S05",
      "category": "frozen_mutation",
      "hook": "onPreToolUse",
      "description": "powershell Set-Content tests/auth.test.js shell bypass blocked",
      "passed": true
    },
    {
      "id": "S06",
      "category": "src_allow",
      "hook": "onPreToolUse",
      "description": "edit src/auth/login.js implementation file allowed",
      "passed": true
    },
    {
      "id": "S07",
      "category": "src_allow",
      "hook": "onPreToolUse",
      "description": "create src/utils/chunk.js implementation file allowed",
      "passed": true
    },
    {
      "id": "S08",
      "category": "src_allow",
      "hook": "onPreToolUse",
      "description": "view tests/auth.test.js read-only inspection of frozen test allowed",
      "passed": true
    },
    {
      "id": "S09",
      "category": "el_mds_abstain",
      "hook": "onPreToolUse",
      "description": "task tool call returns undefined (abstains so el-mds gate runs)",
      "passed": true
    },
    {
      "id": "S10",
      "category": "el_mds_abstain",
      "hook": "onPreToolUse",
      "description": "run_dynamic_workflow call returns undefined (abstains so el-mds gate runs)",
      "passed": true
    },
    {
      "id": "S11",
      "category": "subagent_citation_gate",
      "hook": "onSubagentStop",
      "description": "uncited research subagent output blocked by onSubagentStop",
      "passed": true
    },
    {
      "id": "S12",
      "category": "subagent_anchor_and_cited",
      "hook": "onSubagentStart+onSubagentStop",
      "description": "onSubagentStart injects frozen anchor and onSubagentStop allows cited research output",
      "passed": true
    }
  ]
}
```
