#!/usr/bin/env node
/**
 * Graph Engineering Evaluation & Benchmark Runner
 *
 * Executes all 7 Graph Engineering benchmarks, prints a formatted Markdown/console
 * scorecard, and writes:
 *   - evals/results/eval-scorecard.json
 *   - evals/results/eval-report.md
 *
 * Zero external npm dependencies required.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { ALL_EVAL_RUNNERS } from "./scenarios.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.join(__dirname, "results");
const SCORECARD_JSON_PATH = path.join(RESULTS_DIR, "eval-scorecard.json");
const REPORT_MD_PATH = path.join(RESULTS_DIR, "eval-report.md");

function buildMarkdownReport(scorecard) {
  const lines = [];
  lines.push("# Graph Engineering Evaluation & Benchmark Scorecard");
  lines.push("");
  lines.push(`- **Generated**: \`${scorecard.generatedAt}\``);
  lines.push(`- **Total Evals**: \`${scorecard.summary.passedEvals}/${scorecard.summary.totalEvals}\` passed (\`${scorecard.summary.evalPassRatePct}%\`)`);
  lines.push(`- **Total Assertions**: \`${scorecard.summary.passedAssertions}/${scorecard.summary.totalAssertions}\` green (\`${scorecard.summary.assertionPassRatePct}%\`)`);
  lines.push(`- **Suite Execution Time**: \`${scorecard.summary.durationMs} ms\``);
  lines.push("");
  lines.push("## Executive Scorecard");
  lines.push("");
  lines.push("| # | Eval ID | Status | Assertions | Baseline | Graph Engineering | Key Quantitative Proof |");
  lines.push("|---|---------|--------|------------|----------|-------------------|------------------------|");

  scorecard.evals.forEach((ev, idx) => {
    const statusBadge = ev.passed ? "PASS" : "FAIL";
    const passedCount = ev.assertions.filter((a) => a.passed).length;
    lines.push(
      `| ${idx + 1} | \`${ev.id}\` | **${statusBadge}** | ${passedCount}/${ev.assertions.length} | ${ev.headlineComparison.baseline} | ${ev.headlineComparison.graphEngineering} | **${ev.headlineComparison.improvement}** |`
    );
  });

  lines.push("");
  lines.push("## Detailed Eval Breakdown");
  lines.push("");

  for (const ev of scorecard.evals) {
    lines.push(`### ${ev.title} (\`${ev.id}\`)`);
    lines.push("");
    lines.push(`- **Status**: **${ev.passed ? "PASS" : "FAIL"}**`);
    lines.push(`- **Baseline**: ${ev.headlineComparison.baseline}`);
    lines.push(`- **Graph Engineering**: ${ev.headlineComparison.graphEngineering}`);
    lines.push(`- **Headline Improvement**: **${ev.headlineComparison.improvement}**`);
    lines.push("");
    lines.push("#### Assertions");
    lines.push("");
    lines.push("| Assertion | Status | Actual | Expected |");
    lines.push("|-----------|--------|--------|----------|");
    for (const a of ev.assertions) {
      lines.push(`| ${a.name} | ${a.passed ? "PASS" : "FAIL"} | \`${a.actual}\` | \`${a.expected}\` |`);
    }
    lines.push("");
    lines.push("#### Key Metrics (JSON)");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(ev.metrics, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const suiteStart = performance.now();
  const evalResults = [];

  for (const runner of ALL_EVAL_RUNNERS) {
    const evalStart = performance.now();
    const res = await runner();
    res.durationMs = Number((performance.now() - evalStart).toFixed(2));
    evalResults.push(res);
  }

  const suiteDurationMs = Number((performance.now() - suiteStart).toFixed(2));
  const totalEvals = evalResults.length;
  const passedEvals = evalResults.filter((e) => e.passed).length;
  const totalAssertions = evalResults.reduce((sum, e) => sum + e.assertions.length, 0);
  const passedAssertions = evalResults.reduce(
    (sum, e) => sum + e.assertions.filter((a) => a.passed).length,
    0
  );

  const scorecard = {
    suite: "copilot-workflow-graph-engineering-evals",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
      totalEvals,
      passedEvals,
      failedEvals: totalEvals - passedEvals,
      evalPassRatePct: Number(((passedEvals / totalEvals) * 100).toFixed(1)),
      totalAssertions,
      passedAssertions,
      failedAssertions: totalAssertions - passedAssertions,
      assertionPassRatePct: Number(((passedAssertions / totalAssertions) * 100).toFixed(1)),
      durationMs: suiteDurationMs,
      allGreen: passedEvals === totalEvals && passedAssertions === totalAssertions,
    },
    headlineMetrics: {
      eval1_fakeEdgeSpeedup: {
        sequentialLatencyMs: evalResults[0].metrics.sequentialSimulatedLatencyMs,
        diamondLatencyMs: evalResults[0].metrics.diamondSimulatedLatencyMs,
        sequentialCriticalPathDepth: evalResults[0].metrics.sequentialCriticalPathDepth,
        diamondCriticalPathDepth: evalResults[0].metrics.diamondCriticalPathDepth,
        speedupFactor: evalResults[0].metrics.speedupFactor,
        latencyReductionPct: evalResults[0].metrics.latencyReductionPct,
      },
      eval2_fanInCountGuard: {
        scenariosTested: evalResults[1].metrics.totalScenarios,
        guardedSilentFailurePreventionPct: evalResults[1].metrics.guardedSilentFailurePreventionPct,
        naiveSilentFailurePreventionPct: evalResults[1].metrics.naiveSilentFailurePreventionPct,
      },
      eval3_threeSkepticVerifier: {
        datasetSize: evalResults[2].metrics.datasetSize,
        precisionPct: evalResults[2].metrics.threeSkeptic.precisionPct,
        recallPct: evalResults[2].metrics.threeSkeptic.recallPct,
        f1Pct: evalResults[2].metrics.threeSkeptic.f1Pct,
        falsePositiveFilteringRatePct: evalResults[2].metrics.threeSkeptic.fpFilteringRatePct,
        selfGradingPrecisionPct: evalResults[2].metrics.selfGradingLoop.precisionPct,
        selfGradingF1Pct: evalResults[2].metrics.selfGradingLoop.f1Pct,
        selfGradingFalsePositiveFilteringRatePct: evalResults[2].metrics.selfGradingLoop.fpFilteringRatePct,
      },
      eval4_contextCollapseLayeredFanIn: {
        totalClaims: evalResults[3].metrics.totalClaims,
        flatPeakPromptChars: evalResults[3].metrics.flatPeakPromptChars,
        flatPeakPromptTokens: evalResults[3].metrics.flatPeakPromptTokens,
        layeredPeakPromptChars: evalResults[3].metrics.layeredPeakPromptChars,
        layeredPeakPromptTokens: evalResults[3].metrics.layeredPeakPromptTokens,
        peakContextReductionPct: evalResults[3].metrics.peakContextReductionPct,
      },
      eval5_durableCheckpointReplay: {
        pauseGate: evalResults[4].metrics.pauseGate,
        wave1SubagentsInitial: evalResults[4].metrics.wave1SubagentsInitial,
        wave1SubagentsReRunOnResume: evalResults[4].metrics.wave1SubagentsReRunOnResume,
        replayedStageTokenSavingsPct: evalResults[4].metrics.replayedStageTokenSavingsPct,
        tokensSavedOnResume: evalResults[4].metrics.wave1TokensInitial,
      },
      eval6_cyclicLoopConvergence: {
        roundsExecuted: evalResults[5].metrics.roundsExecuted,
        maxRoundsConfigured: evalResults[5].metrics.maxRoundsConfigured,
        uniqueIssuesFound: evalResults[5].metrics.uniqueIssuesFound,
        duplicatesFiltered: evalResults[5].metrics.duplicatesFiltered,
        deduplicationAccuracyPct: evalResults[5].metrics.deduplicationAccuracyPct,
        terminatedBy: evalResults[5].metrics.terminatedBy,
      },
      eval7_hookAnchorAndElMdsStacking: {
        totalScenarios: evalResults[6].metrics.totalScenarios,
        frozenPathBlockRatePct: evalResults[6].metrics.frozenPathBlockRatePct,
        srcImplementationAllowRatePct: evalResults[6].metrics.srcImplementationAllowRatePct,
        elMdsAbstainRatePct: evalResults[6].metrics.elMdsAbstainRatePct,
        uncitedResearchBlockRatePct: evalResults[6].metrics.uncitedResearchBlockRatePct,
      },
    },
    evals: evalResults,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(SCORECARD_JSON_PATH, JSON.stringify(scorecard, null, 2), "utf8");

  const markdownReport = buildMarkdownReport(scorecard);
  fs.writeFileSync(REPORT_MD_PATH, markdownReport, "utf8");

  // Print formatted console scorecard
  console.log("================================================================================");
  console.log(" GRAPH ENGINEERING BENCHMARK & EVALUATION SCORECARD");
  console.log("================================================================================");
  console.log(
    ` Evals Passed: ${passedEvals}/${totalEvals} (${scorecard.summary.evalPassRatePct}%) | Assertions: ${passedAssertions}/${totalAssertions} (${scorecard.summary.assertionPassRatePct}%) | Duration: ${suiteDurationMs} ms`
  );
  console.log("--------------------------------------------------------------------------------");
  for (const ev of evalResults) {
    const badge = ev.passed ? "[PASS]" : "[FAIL]";
    const aCount = `${ev.assertions.filter((a) => a.passed).length}/${ev.assertions.length}`;
    console.log(` ${badge} ${ev.id.padEnd(33)} (${aCount} assertions) -> ${ev.headlineComparison.improvement}`);
  }
  console.log("--------------------------------------------------------------------------------");
  console.log(` JSON Scorecard : ${SCORECARD_JSON_PATH}`);
  console.log(` Markdown Report: ${REPORT_MD_PATH}`);
  console.log("================================================================================");

  if (!scorecard.summary.allGreen) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal error running Graph Engineering evals:", err);
  process.exitCode = 1;
});
