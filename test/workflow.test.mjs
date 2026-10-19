import test from "node:test";
import assert from "node:assert/strict";
import {
  FINDING_SCHEMA,
  VERDICT_SCHEMA,
  REPORT_SCHEMA,
  diamondMetadata,
  chunkArray,
  dedupeClaims,
  selectVerifierLensesViaElJev,
  verifyClaims,
  runDiamondEngine,
  createDiamondHooks,
} from "../.github/extensions/diamond-workflow/workflow.mjs";

/**
 * Helper to create an in-memory mock Copilot SDK workflow context (`ctx`)
 * supporting `agent`, `parallel`, `pipeline`, `step` journaling, `pause` checkpoints, `phase`, and `log`.
 */
function createMockWorkflowRuntime(agentResponder, initialArgs = {}) {
  const journal = new Map();
  const completedPauses = new Set();
  const agentCalls = [];
  const logs = [];
  const phases = [];

  function buildCtx(argsOverride) {
    const ctx = {
      runId: "test-run-001",
      args: argsOverride ?? initialArgs,
      phase: (title) => {
        phases.push(title);
      },
      log: (msg) => {
        logs.push(msg);
      },
      step: async (key, producer, options = {}) => {
        if (!options?.volatile && journal.has(key)) {
          return structuredClone(journal.get(key));
        }
        const value = await producer();
        const serialized = JSON.parse(JSON.stringify(value));
        if (!options?.volatile) {
          journal.set(key, serialized);
        }
        return serialized;
      },
      pause: async (key) => {
        if (!completedPauses.has(key)) {
          completedPauses.add(key);
          const err = new Error(`Paused at checkpoint: ${key}`);
          err.name = "AbortError";
          err.pauseKey = key;
          throw err;
        }
      },
      parallel: async (thunks) => {
        return Promise.all(
          thunks.map(async (thunk) => {
            try {
              return await thunk();
            } catch (err) {
              if (err?.name === "AbortError") {
                throw err;
              }
              return null;
            }
          }),
        );
      },
      pipeline: async (items, ...stages) => {
        return Promise.all(
          items.map(async (item, index) => {
            let current = item;
            for (const stage of stages) {
              try {
                current = await stage(current, item, index);
              } catch (err) {
                if (err?.name === "AbortError") {
                  throw err;
                }
                return null;
              }
            }
            return current;
          }),
        );
      },
      agent: async (prompt, options = {}) => {
        agentCalls.push({ prompt, options });
        return agentResponder(prompt, options, agentCalls.length - 1);
      },
    };
    return ctx;
  }

  return {
    buildCtx,
    journal,
    completedPauses,
    agentCalls,
    logs,
    phases,
  };
}

test("1. Single-Diamond execution: unique worker labels, plain-code deduplication, 3-skeptic majority vote, and synthesis", async () => {
  const runtime = createMockWorkflowRuntime(async (_prompt, options) => {
    const label = options.label || "";
    if (label === "worker:w1:0") {
      return {
        unit: "Angle 1",
        claims: [
          {
            key: "claim-alpha",
            claim: "ACA supports workload profiles with dedicated GPU SKUs.",
            source: "https://learn.microsoft.com/azure/container-apps/workload-profiles-overview",
            status: "Verified",
          },
          {
            key: "claim-weak",
            claim: "ACA has unlimited free egress.",
            source: "blog rumor",
            status: "Inferred",
          },
        ],
      };
    }
    if (label === "worker:w1:1") {
      return {
        unit: "Angle 2",
        claims: [
          // Duplicate of claim-alpha from Worker 0 — should be deduplicated in plain code
          {
            key: "CLAIM-ALPHA",
            claim: "ACA supports workload profiles with dedicated GPU SKUs.",
            source: "https://learn.microsoft.com/azure/container-apps/workload-profiles-overview",
            status: "Verified",
          },
        ],
      };
    }
    if (label === "worker:w1:2") {
      return {
        unit: "Angle 3",
        claims: [
          {
            key: "claim-beta",
            claim: "Session affinity is configured in ingress settings.",
            source: "src/ingress.ts:42",
            status: "Verified",
          },
        ],
      };
    }

    // 3-skeptic verifier calls:
    // item 0 (claim-alpha): 2/3 pass -> survives
    if (label === "verify:w1:0:correct") return { pass: true, reason: "Accurate", lens: "correct" };
    if (label === "verify:w1:0:current") return { pass: true, reason: "Current GA", lens: "current" };
    if (label === "verify:w1:0:real_source") return { pass: false, reason: "Want deeper doc link", lens: "real_source" };

    // item 1 (claim-weak): 1/3 pass -> dropped (< 2/3)
    if (label === "verify:w1:1:correct") return { pass: false, reason: "False claim", lens: "correct" };
    if (label === "verify:w1:1:current") return { pass: true, reason: "Recent rumor", lens: "current" };
    if (label === "verify:w1:1:real_source") return { pass: false, reason: "No primary source", lens: "real_source" };

    // item 2 (claim-beta): 3/3 pass -> survives
    if (label.startsWith("verify:w1:2:")) {
      const lens = label.split(":").pop();
      return { pass: true, reason: "Verified source", lens };
    }

    if (label === "synth:final:v1") {
      return {
        summary: "Synthesized 2 verified claims, dropped 1.",
        verifiedClaims: [
          {
            key: "claim-alpha",
            claim: "ACA supports workload profiles with dedicated GPU SKUs.",
            source: "https://learn.microsoft.com/azure/container-apps/workload-profiles-overview",
          },
          {
            key: "claim-beta",
            claim: "Session affinity is configured in ingress settings.",
            source: "src/ingress.ts:42",
          },
        ],
        droppedClaims: ["claim-weak"],
        missingUnits: [],
      };
    }
    return null;
  });

  const ctx = runtime.buildCtx({
    specId: "research-desk",
    topology: "diamond",
    goal: "Evaluate ACA architecture",
    units: ["Angle 1", "Angle 2", "Angle 3"],
    verifierLenses: ["correct", "current", "real_source"],
    pauseAtGate: false,
  });

  const result = await runDiamondEngine(ctx);

  // Verify unique labels on all worker calls
  const workerLabels = runtime.agentCalls
    .filter((c) => c.options.label?.startsWith("worker:w1:"))
    .map((c) => c.options.label);
  assert.deepEqual(workerLabels, ["worker:w1:0", "worker:w1:1", "worker:w1:2"]);

  // Verify deduplication reduced 4 raw claims to 3 unique claims -> 3 * 3 = 9 verifier calls
  const verifyCalls = runtime.agentCalls.filter((c) => c.options.label?.startsWith("verify:w1:"));
  assert.equal(verifyCalls.length, 9);
  assert.ok(verifyCalls.every((c) => c.options.agent === "rubber-duck"));

  // Verify 2/3 majority kept claim-alpha and 3/3 kept claim-beta, while 1/3 dropped claim-weak
  assert.equal(result.verifiedClaims.length, 2);
  assert.deepEqual(
    result.verifiedClaims.map((c) => c.key),
    ["claim-alpha", "claim-beta"],
  );
  assert.deepEqual(result.droppedClaims, ["claim-weak"]);
  assert.deepEqual(result.missingUnits, []);
});

test("2. Fan-In Count Guard: logs warning when quorum holds with partial null, and throws when majority returns null", async () => {
  // Case A: 2 of 3 succeed (quorum >= 2 holds), 1 returns null
  const partialRuntime = createMockWorkflowRuntime(async (_prompt, options) => {
    const label = options.label || "";
    if (label === "worker:w1:0") {
      return {
        unit: "routes/auth.js",
        claims: [{ key: "auth-1", claim: "Missing rate limit", source: "routes/auth.js:19", status: "Verified" }],
      };
    }
    if (label === "worker:w1:1") {
      return null; // Worker failed / timed out
    }
    if (label === "worker:w1:2") {
      return {
        unit: "routes/api.js",
        claims: [{ key: "api-1", claim: "Validates JWT", source: "routes/api.js:44", status: "Verified" }],
      };
    }
    if (label.startsWith("verify:")) {
      return { pass: true, reason: "Confirmed", lens: "correct" };
    }
    return null;
  });

  const partialResult = await runDiamondEngine(
    partialRuntime.buildCtx({
      specId: "route-audit",
      topology: "diamond",
      goal: "Audit API routes",
      units: ["routes/auth.js", "routes/payments.js", "routes/api.js"],
      pauseAtGate: false,
    }),
  );

  assert.equal(partialResult.returnedUnits, 2);
  assert.equal(partialResult.totalUnits, 3);
  assert.deepEqual(partialResult.missingUnits, ["routes/payments.js"]);
  assert.ok(partialRuntime.logs.some((l) => l.includes("routes/payments.js")));

  // Case B: 2 of 3 return null (1/3 < ceil(3/2)=2) -> throws Fan-In Count Guard error before verification
  const failingRuntime = createMockWorkflowRuntime(async (_prompt, options) => {
    if (options.label === "worker:w1:0") {
      return {
        unit: "routes/auth.js",
        claims: [{ key: "auth-1", claim: "Missing rate limit", source: "routes/auth.js:19", status: "Verified" }],
      };
    }
    return null;
  });

  await assert.rejects(
    async () =>
      runDiamondEngine(
        failingRuntime.buildCtx({
          specId: "route-audit",
          topology: "diamond",
          goal: "Audit API routes",
          units: ["routes/auth.js", "routes/payments.js", "routes/api.js"],
        }),
      ),
    /\[Fan-In Count Guard\] Wave w1 quorum failed: 1\/3 workers returned valid output/,
  );
});

test("3. Layered Fan-In: chunks surviving claims exceeding batchSize and runs batch summarizers before final synthesis", async () => {
  const runtime = createMockWorkflowRuntime(async (_prompt, options) => {
    const label = options.label || "";
    if (label === "worker:w1:0") {
      return {
        unit: "Unit 0",
        claims: [
          { key: "c1", claim: "Claim 1", source: "a.js:1", status: "Verified" },
          { key: "c2", claim: "Claim 2", source: "a.js:2", status: "Verified" },
          { key: "c3", claim: "Claim 3", source: "a.js:3", status: "Verified" },
        ],
      };
    }
    if (label === "worker:w1:1") {
      return {
        unit: "Unit 1",
        claims: [
          { key: "c4", claim: "Claim 4", source: "b.js:1", status: "Verified" },
          { key: "c5", claim: "Claim 5", source: "b.js:2", status: "Verified" },
        ],
      };
    }
    if (label.startsWith("verify:")) {
      return { pass: true, reason: "OK", lens: "correct" };
    }
    if (label.startsWith("synth:batch:")) {
      const bIdx = label.split(":").pop();
      return {
        unit: `batch-${bIdx}`,
        claims: [
          {
            key: `condensed-${bIdx}`,
            claim: `Condensed batch ${bIdx}`,
            source: `batch:${bIdx}:1`,
            status: "Verified",
          },
        ],
      };
    }
    return null;
  });

  const result = await runDiamondEngine(
    runtime.buildCtx({
      specId: "route-audit",
      topology: "diamond",
      goal: "Sweep 5 claims with batchSize 2",
      units: ["Unit 0", "Unit 1"],
      batchSize: 2,
      pauseAtGate: false,
    }),
  );

  // 5 surviving claims with batchSize=2 -> ceil(5/2) = 3 batch summarizer calls
  const batchLabels = runtime.agentCalls
    .filter((c) => c.options.label?.startsWith("synth:batch:"))
    .map((c) => c.options.label);
  assert.deepEqual(batchLabels, ["synth:batch:0", "synth:batch:1", "synth:batch:2"]);
  assert.equal(result.verifiedClaims.length, 3);
});

test("4. Double-Diamond (gtm-kit): journals positioning-doc-v1, pauses at approve-positioning-v1, and resumes with 0 duplicate Wave 1 calls", async () => {
  const runtime = createMockWorkflowRuntime(async (_prompt, options) => {
    const label = options.label || "";
    if (label.startsWith("worker:w1:")) {
      const idx = label.split(":").pop();
      return {
        unit: `w1-${idx}`,
        claims: [
          {
            key: `pos-claim-${idx}`,
            claim: `Positioning insight ${idx}`,
            source: `https://learn.microsoft.com/doc-${idx}`,
            status: "Verified",
          },
        ],
      };
    }
    if (label.startsWith("verify:w1:")) {
      return { pass: true, reason: "Verified positioning claim", lens: "correct" };
    }
    if (label === "synth:positioning:v1") {
      return {
        summary: "Locked GTM Positioning v1",
        verifiedClaims: [
          { key: "pos-claim-0", claim: "Positioning insight 0", source: "https://learn.microsoft.com/doc-0" },
        ],
        droppedClaims: [],
        missingUnits: [],
      };
    }
    if (label.startsWith("worker:w2:")) {
      const idx = label.split(":").pop();
      return {
        unit: `asset-${idx}`,
        claims: [
          {
            key: `asset-claim-${idx}`,
            claim: `Generated GTM asset ${idx} aligned with Positioning v1`,
            source: `positioning-doc-v1:${idx}`,
            status: "Verified",
          },
        ],
      };
    }
    if (label.startsWith("verify:w2:")) {
      return { pass: true, reason: "Aligned with positioning-doc-v1", lens: "correct" };
    }
    return null;
  });

  const args = {
    specId: "gtm-kit",
    topology: "double-diamond",
    goal: "Launch Azure AI Foundry GTM Kit",
    units: ["icp_pain", "competitor_matrix"],
    secondaryUnits: ["pitch_deck", "battlecard", "outbound_email"],
  };

  // Attempt 1: Runs Wave 1, journals `positioning-doc-v1`, and pauses at `approve-positioning-v1`
  await assert.rejects(
    async () => runDiamondEngine(runtime.buildCtx(args)),
    (err) => err.name === "AbortError" && err.pauseKey === "approve-positioning-v1",
  );

  assert.ok(runtime.journal.has("positioning-doc-v1"));
  const wave1CallCountAfterPause = runtime.agentCalls.filter((c) =>
    c.options.label?.startsWith("worker:w1:"),
  ).length;
  assert.equal(wave1CallCountAfterPause, 2);

  // Attempt 2 (Resume): Replays `positioning-doc-v1` from journal with 0 duplicate Wave 1 calls and completes Wave 2
  const resumedResult = await runDiamondEngine(runtime.buildCtx(args));

  const wave1CallCountAfterResume = runtime.agentCalls.filter((c) =>
    c.options.label?.startsWith("worker:w1:"),
  ).length;
  assert.equal(wave1CallCountAfterResume, 2, "Must not re-run Wave 1 workers on resume");

  const wave2Labels = runtime.agentCalls
    .filter((c) => c.options.label?.startsWith("worker:w2:"))
    .map((c) => c.options.label);
  assert.deepEqual(wave2Labels, ["worker:w2:0", "worker:w2:1", "worker:w2:2"]);
  assert.equal(resumedResult.positioningDoc.summary, "Locked GTM Positioning v1");
  assert.equal(resumedResult.verifiedClaims.length, 3);
});

test("5. Cyclic Discovery Loop (discovery-loop): deduplicates across rounds and exits after 2 consecutive zero-new-finding rounds", async () => {
  const runtime = createMockWorkflowRuntime(async (_prompt, options) => {
    const label = options.label || "";
    // Round 1: returns 2 new findings
    if (label.startsWith("finder:r1:")) {
      const idx = label.split(":").pop();
      return {
        unit: `vec-${idx}`,
        claims: [
          {
            key: `bug-r1-${idx}`,
            claim: `Race condition in handler ${idx}`,
            source: `src/handler.js:${10 + Number(idx)}`,
            status: "Verified",
          },
        ],
      };
    }
    // Round 2: returns only duplicate of Round 1 -> 0 new findings (emptyRounds = 1)
    if (label.startsWith("finder:r2:")) {
      return {
        unit: "vec-dup",
        claims: [
          {
            key: "bug-r1-0",
            claim: "Race condition in handler 0",
            source: "src/handler.js:10",
            status: "Verified",
          },
        ],
      };
    }
    // Round 3: returns 0 new findings -> 2nd consecutive empty round (emptyRounds = 2) -> loop exits before Round 4/5
    if (label.startsWith("finder:r3:")) {
      return {
        unit: "vec-empty",
        claims: [],
      };
    }
    if (label.startsWith("verify:")) {
      return { pass: true, reason: "Confirmed bug", lens: "correct" };
    }
    return null;
  });

  const result = await runDiamondEngine(
    runtime.buildCtx({
      specId: "discovery-loop",
      topology: "cyclic-loop",
      goal: "Hunt concurrency bugs",
      units: ["auth_boundary", "state_races"],
      maxRounds: 5,
    }),
  );

  assert.equal(result.roundsExecuted, 3, "Should stop after Round 3 (2 consecutive empty rounds)");
  assert.equal(result.verifiedClaims.length, 2);
  assert.deepEqual(
    result.verifiedClaims.map((c) => c.key),
    ["bug-r1-0", "bug-r1-1"],
  );
});

test("6. Hook non-interference, Frozen Rules guard, and el-jev fail-open helper", async () => {
  const frozenHooks = createDiamondHooks({ COPILOT_FREEZE_TESTS: "1" });

  // 6a. Denies edit on tests/foo.test.js when COPILOT_FREEZE_TESTS=1
  const denyTestFile = await frozenHooks.onPreToolUse({
    toolName: "edit",
    toolArgs: { path: "tests/foo.test.js" },
  });
  assert.equal(denyTestFile?.permissionDecision, "deny");

  // 6b. Abstains (undefined) on normal source files
  const allowSrcFile = await frozenHooks.onPreToolUse({
    toolName: "edit",
    toolArgs: { path: "src/app.js" },
  });
  assert.equal(allowSrcFile, undefined);

  // 6c. Abstains (undefined) on `task` and `run_dynamic_workflow` (zero conflict with `el-mds`)
  const abstainTask = await frozenHooks.onPreToolUse({
    toolName: "task",
    toolArgs: { agent_type: "explore", prompt: "check repo" },
  });
  const abstainWorkflow = await frozenHooks.onPreToolUse({
    toolName: "run_dynamic_workflow",
    toolArgs: { name: "diamond-engine" },
  });
  assert.equal(abstainTask, undefined);
  assert.equal(abstainWorkflow, undefined);

  // 6d. onSubagentStart injects Node Contract Anchor for `research` and `explore`
  const startResearch = await frozenHooks.onSubagentStart({ agentName: "research" });
  assert.ok(startResearch?.additionalContext?.includes("[Node Contract Anchor]"));
  const startTask = await frozenHooks.onSubagentStart({ agentName: "task" });
  assert.equal(startTask, undefined);

  // 6e. onSubagentStop blocks uncited `research` output and allows cited output
  const blockedStop = await frozenHooks.onSubagentStop({
    agentName: "research",
    response: "Everything works great with high performance and low cost.",
  });
  assert.equal(blockedStop?.decision, "block");

  const allowedStop = await frozenHooks.onSubagentStop({
    agentName: "research",
    response: "Verified in src/server.ts:88 and https://learn.microsoft.com/azure.",
  });
  assert.equal(allowedStop, undefined);

  // 6f. selectVerifierLensesViaElJev fails open to defaultLenses on error/timeout
  const fallbackLenses = await selectVerifierLensesViaElJev(
    "Test goal",
    5,
    ["correct", "current", "real_source"],
    {
      useElJev: true,
      fetchImpl: async () => {
        throw new Error("Connection refused");
      },
    },
  );
  assert.deepEqual(fallbackLenses, ["correct", "current", "real_source"]);
});
