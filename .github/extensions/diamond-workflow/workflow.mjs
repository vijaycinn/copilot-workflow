/**
 * Diamond Workflow Engine (`diamond-engine`) + Copilot SDK Hooks.
 *
 * Implements the 3 core Kopadze graph topologies:
 *   1. `diamond`        — Split -> Parallel Workers -> Plain-Code Reduce + Count Guard -> Fresh-Context 3-Skeptic Verifier -> Layered Fan-In -> Synthesize
 *   2. `double-diamond` — Wave 1 Diamond -> Journaled Positioning Doc -> Durable `ctx.pause("approve-positioning-v1")` -> Wave 2 Asset Writers -> Alignment Verifier
 *   3. `cyclic-loop`    — Iterative parallel finders -> Cumulative `seen` dedupe -> Fresh-Context Verifier -> Auto-exit after 2 consecutive zero-new-finding rounds
 */

export const FINDING_SCHEMA = {
  type: "object",
  required: ["unit", "claims"],
  properties: {
    unit: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "claim", "source", "status"],
        properties: {
          key: { type: "string" },
          claim: { type: "string" },
          source: { type: "string" },
          status: { type: "string", enum: ["Verified", "Inferred", "Unknown"] },
        },
      },
    },
  },
};

export const VERDICT_SCHEMA = {
  type: "object",
  required: ["pass", "reason", "lens"],
  properties: {
    pass: { type: "boolean" },
    reason: { type: "string" },
    lens: { type: "string", enum: ["correct", "current", "real_source"] },
  },
};

export const REPORT_SCHEMA = {
  type: "object",
  required: ["summary", "verifiedClaims", "droppedClaims", "missingUnits"],
  properties: {
    summary: { type: "string" },
    verifiedClaims: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "claim", "source"],
        properties: {
          key: { type: "string" },
          claim: { type: "string" },
          source: { type: "string" },
        },
      },
    },
    droppedClaims: {
      type: "array",
      items: { type: "string" },
    },
    missingUnits: {
      type: "array",
      items: { type: "string" },
    },
  },
};

export const SPEC_PRESETS = {
  "route-audit": {
    topology: "diamond",
    verifierLenses: ["correct"],
    pauseAtGate: false,
    maxUnits: 20,
    defaultUnits: ["routes/index.js", "routes/auth.js", "routes/api.js"],
  },
  "research-desk": {
    topology: "diamond",
    verifierLenses: ["correct", "current", "real_source"],
    pauseAtGate: true,
    maxUnits: 10,
    defaultUnits: [
      "What changed in the last 6 months (releases, GA/preview shifts, deprecations)",
      "How it works in production (architecture, throughput, scaling limits)",
      "What breaks (failure modes, quotas, operational gotchas, regional gaps)",
      "Competitor and alternative approaches (trade-offs, migration friction)",
      "Economics, pricing mechanics, and governance/compliance impact",
    ],
  },
  "content-brief": {
    topology: "diamond",
    verifierLenses: ["real_source"],
    pauseAtGate: false,
    maxUnits: 10,
    defaultUnits: [
      "coverage: Top existing explanations, official docs, and canonical reference architectures",
      "real_questions: Practitioner pain points, recurring objections, and unresolved edge cases",
      "gaps: What existing coverage gets wrong, omits, or leaves unquantified",
    ],
  },
  "gtm-kit": {
    topology: "double-diamond",
    verifierLenses: ["correct", "real_source"],
    pauseAtGate: true,
    maxUnits: 10,
    defaultUnits: [
      "icp_pain: Target persona pain points, quantification, and buying triggers",
      "competitor_matrix: Competitive alternatives, landmines, and defensible differentiators",
      "proof_points: Verifiable customer evidence, benchmarks, and technical proof",
    ],
    defaultSecondaryUnits: [
      "pitch_deck: 5-slide executive narrative and architecture spine",
      "battlecard: Objection-handling and competitive counter-play card",
      "outbound_email: BLUF customer follow-up draft",
    ],
  },
  "refactor-sweep": {
    topology: "diamond",
    verifierLenses: ["correct"],
    pauseAtGate: false,
    maxUnits: 50,
    defaultUnits: ["src/index.js"],
  },
  "discovery-loop": {
    topology: "cyclic-loop",
    verifierLenses: ["correct", "real_source"],
    pauseAtGate: false,
    maxUnits: 12,
    defaultUnits: [
      "auth_boundary: Authentication, session, and privilege escalation paths",
      "input_surface: Deserialization, parser, and injection boundaries",
      "state_races: Concurrency, idempotency, and retry failure modes",
    ],
  },
};

export const diamondMetadata = {
  name: "diamond-engine",
  description:
    "Execute Diamond, Double-Diamond, and Cyclic Discovery Loop multi-agent workflows with plain-code deduplication, fan-in count guards, 3-skeptic majority-vote verification, layered fan-in batching, and durable checkpoints.",
  phases: [
    { title: "Split & Wave 1", detail: "Dispatch orthogonal workers with unique labels and JSON schemas" },
    { title: "Plain-Code Reduce & Count Guard", detail: "Deduplicate claims in JS and enforce worker quorum" },
    { title: "Fresh-Context Verification", detail: "Run 3-skeptic or single-lens verification on surviving claims" },
    { title: "Wave 2 / Discovery Loop", detail: "Execute post-gate Wave 2 writers or iterative discovery rounds" },
    { title: "Synthesize", detail: "Layered fan-in batching and final report synthesis" },
  ],
  argsSchema: {
    type: "object",
    required: ["goal"],
    properties: {
      specId: {
        type: "string",
        enum: [
          "route-audit",
          "research-desk",
          "content-brief",
          "gtm-kit",
          "refactor-sweep",
          "discovery-loop",
        ],
      },
      topology: {
        type: "string",
        enum: ["diamond", "double-diamond", "cyclic-loop"],
      },
      goal: { type: "string" },
      units: {
        type: "array",
        items: { type: "string" },
      },
      secondaryUnits: {
        type: "array",
        items: { type: "string" },
      },
      verifierLenses: {
        type: "array",
        items: {
          type: "string",
          enum: ["correct", "current", "real_source"],
        },
      },
      pauseAtGate: { type: "boolean" },
      batchSize: { type: "integer" },
      maxRounds: { type: "integer" },
      useElJev: { type: "boolean" },
    },
  },
};

/**
 * Split an array into chunks of at most `size` items.
 */
export function chunkArray(items, size = 40) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const chunkSize = Math.max(1, Number(size) || 40);
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Normalize a claim key for deterministic plain-code deduplication.
 */
export function normalizeClaimKey(claimObj) {
  const rawKey = typeof claimObj?.key === "string" && claimObj.key.trim()
    ? claimObj.key
    : typeof claimObj?.claim === "string"
      ? claimObj.claim
      : "";
  return rawKey
    .toLowerCase()
    .replace(/[^a-z0-9:._/-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Plain-code deduplication across worker findings.
 * Mutates `seenKeys` when passed so cyclic loops can track cumulative state across rounds.
 */
export function dedupeClaims(findingsList, seenKeys = new Set()) {
  const uniqueClaims = [];
  const duplicateKeys = [];

  if (!Array.isArray(findingsList)) {
    return { uniqueClaims, duplicateKeys, seenKeys };
  }

  for (const finding of findingsList) {
    if (!finding || !Array.isArray(finding.claims)) {
      continue;
    }
    const unitName = typeof finding.unit === "string" ? finding.unit : "unknown";
    for (const item of finding.claims) {
      if (!item || typeof item.claim !== "string" || !item.claim.trim()) {
        continue;
      }
      const normKey = normalizeClaimKey(item);
      if (!normKey) {
        continue;
      }
      if (seenKeys.has(normKey)) {
        duplicateKeys.push(normKey);
        continue;
      }
      seenKeys.add(normKey);
      uniqueClaims.push({
        key: item.key || normKey,
        normalizedKey: normKey,
        claim: item.claim.trim(),
        source: typeof item.source === "string" ? item.source.trim() : "",
        status:
          item.status === "Verified" || item.status === "Inferred" || item.status === "Unknown"
            ? item.status
            : "Unknown",
        unit: unitName,
      });
    }
  }

  return { uniqueClaims, duplicateKeys, seenKeys };
}

/**
 * Optional fail-open System-1 triage helper via local el-jev daemon (`/v1/decide`).
 * Never blocks or throws: falls back to `defaultLenses` on timeout, error, or abstain.
 */
export async function selectVerifierLensesViaElJev(
  goal,
  claimCount,
  defaultLenses = ["correct", "current", "real_source"],
  options = {},
) {
  if (!options || options.useElJev !== true) {
    return defaultLenses;
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return defaultLenses;
  }
  const port = Number(options.port || process.env.ELJEV_PORT || 8787);
  const timeoutMs = Number(options.timeoutMs || 600);

  let signal;
  let cleanup = () => {};
  if (typeof AbortController !== "undefined") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    signal = controller.signal;
    cleanup = () => clearTimeout(timer);
  }

  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/v1/decide`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state: {
          goal: String(goal || ""),
          claim_count: Number(claimCount) || 0,
        },
        question: {
          id: "diamond-verifier-depth",
          kind: "choice",
          instructions:
            "Select single_correct for low-risk code/internal checks or full_3_skeptic for external research and high-risk claims.",
          options: ["single_correct", "full_3_skeptic"],
        },
        engine: "md1",
      }),
      signal,
    });
    if (!response || !response.ok) {
      return defaultLenses;
    }
    const data = await response.json();
    if (!data || data.status !== "selected") {
      return defaultLenses;
    }
    if (data.choice === "single_correct" || data.choice_index === 0) {
      return ["correct"];
    }
    if (data.choice === "full_3_skeptic" || data.choice_index === 1) {
      return ["correct", "current", "real_source"];
    }
    return defaultLenses;
  } catch {
    return defaultLenses;
  } finally {
    cleanup();
  }
}

/**
 * Fresh-context verifier gate using `ctx.pipeline` + `ctx.parallel`.
 * Each claim is checked across `lenses` by independent `rubber-duck` subagents with unique labels.
 * Majority vote rule: `passCount >= Math.ceil(lenses.length * (2 / 3))` (e.g. >=2/3 for 3 lenses, 1/1 for 1 lens).
 */
export async function verifyClaims(ctx, claims, lenses = ["correct", "current", "real_source"], tag = "w1") {
  if (!Array.isArray(claims) || claims.length === 0) {
    return { survivors: [], droppedClaims: [], rawEvaluations: [] };
  }
  const activeLenses = Array.isArray(lenses) && lenses.length > 0 ? lenses : ["correct"];
  const requiredVotes = Math.ceil(activeLenses.length * (2 / 3));

  const evaluations = await ctx.pipeline(claims, async (_prev, item, idx) => {
    const verdicts = await ctx.parallel(
      activeLenses.map((lens) => () =>
        ctx.agent(
          `[Verifier Lens: ${lens}] Verify this claim in fresh context.\n` +
            `Claim Key: ${item.key}\n` +
            `Claim: ${item.claim}\n` +
            `Source: ${item.source}\n` +
            `Status: ${item.status}\n` +
            `Lens rules:\n` +
            `- "correct": Is the technical or code claim accurate and internally consistent?\n` +
            `- "current": Is the evidence current and not superseded or deprecated?\n` +
            `- "real_source": Does it cite a concrete file:line, commit SHA, or primary URL rather than hand-waving?`,
          {
            label: `verify:${tag}:${idx}:${lens}`,
            agent: "rubber-duck",
            schema: VERDICT_SCHEMA,
          },
        ),
      ),
    );

    const validVerdicts = (verdicts || []).filter((v) => v !== null && typeof v === "object");
    const passCount = validVerdicts.filter((v) => v.pass === true).length;
    const passed = passCount >= requiredVotes;

    return {
      claim: item,
      passed,
      passCount,
      requiredVotes,
      verdicts: validVerdicts,
    };
  });

  const survivors = [];
  const droppedClaims = [];
  const rawEvaluations = (evaluations || []).filter((e) => e !== null);

  for (const ev of rawEvaluations) {
    if (ev.passed) {
      survivors.push({
        key: ev.claim.key,
        claim: ev.claim.claim,
        source: ev.claim.source,
        status: "Verified",
        unit: ev.claim.unit,
      });
    } else {
      droppedClaims.push(ev.claim.key);
    }
  }

  return { survivors, droppedClaims, rawEvaluations };
}

/**
 * Plain-code fan-in count guard + deduplication helper.
 * Halts (throws) if fewer than `Math.ceil(units.length / 2)` workers succeed.
 */
function reduceWaveWithCountGuard(ctx, units, workerResults, seenKeys = new Set(), waveLabel = "w1") {
  const totalUnits = units.length;
  const minQuorum = Math.ceil(totalUnits / 2);
  const missingUnits = [];
  const validFindings = [];

  for (let i = 0; i < totalUnits; i++) {
    const res = Array.isArray(workerResults) ? workerResults[i] : null;
    if (res !== null && res !== undefined && typeof res === "object" && Array.isArray(res.claims)) {
      validFindings.push({
        unit: res.unit || units[i],
        claims: res.claims,
      });
    } else {
      missingUnits.push(units[i]);
    }
  }

  const returnedUnits = validFindings.length;
  if (returnedUnits < minQuorum) {
    throw new Error(
      `[Fan-In Count Guard] Wave ${waveLabel} quorum failed: ${returnedUnits}/${totalUnits} workers returned valid output (minimum quorum: ${minQuorum}). Missing units: ${missingUnits.join(", ")}`,
    );
  }

  if (missingUnits.length > 0 && typeof ctx?.log === "function") {
    ctx.log(
      `[Fan-In Count Guard Warning] Wave ${waveLabel} partial worker failure: ${missingUnits.length}/${totalUnits} units returned null (${missingUnits.join(", ")}). Proceeding with ${returnedUnits}/${totalUnits} quorum.`,
    );
  }

  const { uniqueClaims, duplicateKeys } = dedupeClaims(validFindings, seenKeys);
  return {
    totalUnits,
    returnedUnits,
    missingUnits,
    uniqueClaims,
    duplicateKeys,
  };
}

/**
 * Layered fan-in synthesis to prevent Context Collapse when surviving claims exceed `batchSize`.
 */
async function synthesizeWithLayeredFanIn(ctx, goal, survivors, droppedClaims, missingUnits, batchSize = 40) {
  let claimsToSynthesize = survivors;

  if (survivors.length > batchSize) {
    const batches = chunkArray(survivors, batchSize);
    if (typeof ctx.log === "function") {
      ctx.log(
        `[Layered Fan-In] Surviving claims (${survivors.length}) exceed batchSize (${batchSize}); summarizing across ${batches.length} intermediate batches.`,
      );
    }
    const batchResults = await ctx.parallel(
      batches.map((batch, bIdx) => () =>
        ctx.agent(
          `[Batch Summarizer ${bIdx + 1}/${batches.length}] Condense these ${batch.length} verified claims for goal: ${goal}.\n` +
            `Preserve exact key, claim precision, and source citations.\n` +
            `Input claims JSON:\n${JSON.stringify(batch)}`,
          {
            label: `synth:batch:${bIdx}`,
            agent: "Vijay Agent",
            schema: FINDING_SCHEMA,
          },
        ),
      ),
    );
    const { uniqueClaims } = dedupeClaims(
      (batchResults || []).filter((b) => b !== null),
      new Set(),
    );
    if (uniqueClaims.length > 0) {
      claimsToSynthesize = uniqueClaims;
    }
  }

  const finalReport = await ctx.agent(
    `[Diamond Final Synthesizer] Produce the final verified report for goal: ${goal}\n` +
      `Surviving verified claims (${claimsToSynthesize.length}):\n${JSON.stringify(claimsToSynthesize)}\n` +
      `Dropped claim keys (${droppedClaims.length}): ${JSON.stringify(droppedClaims)}\n` +
      `Missing / unverified units (${missingUnits.length}): ${JSON.stringify(missingUnits)}`,
    {
      label: "synth:final:v1",
      agent: "Vijay Agent",
      schema: REPORT_SCHEMA,
    },
  );

  if (finalReport && typeof finalReport === "object") {
    return {
      summary: finalReport.summary || `Completed synthesis for: ${goal}`,
      verifiedClaims: Array.isArray(finalReport.verifiedClaims)
        ? finalReport.verifiedClaims
        : claimsToSynthesize.map((c) => ({ key: c.key, claim: c.claim, source: c.source })),
      droppedClaims: Array.isArray(finalReport.droppedClaims) ? finalReport.droppedClaims : droppedClaims,
      missingUnits: Array.isArray(finalReport.missingUnits) ? finalReport.missingUnits : missingUnits,
    };
  }

  return {
    summary: `Fallback deterministic synthesis for: ${goal}`,
    verifiedClaims: claimsToSynthesize.map((c) => ({ key: c.key, claim: c.claim, source: c.source })),
    droppedClaims,
    missingUnits,
  };
}

/**
 * Main `diamond-engine` workflow runner.
 */
export async function runDiamondEngine(ctx) {
  const args = ctx?.args && typeof ctx.args === "object" ? ctx.args : {};
  const specId = typeof args.specId === "string" && SPEC_PRESETS[args.specId] ? args.specId : "research-desk";
  const preset = SPEC_PRESETS[specId];

  const topology =
    args.topology === "diamond" || args.topology === "double-diamond" || args.topology === "cyclic-loop"
      ? args.topology
      : preset.topology;

  const goal = typeof args.goal === "string" && args.goal.trim() ? args.goal.trim() : `Execute ${specId} workflow`;
  const rawUnits =
    Array.isArray(args.units) && args.units.length > 0 ? args.units : preset.defaultUnits;
  const units = rawUnits.slice(0, preset.maxUnits || 50);

  const defaultLenses =
    Array.isArray(args.verifierLenses) && args.verifierLenses.length > 0
      ? args.verifierLenses
      : preset.verifierLenses;

  const pauseAtGate = typeof args.pauseAtGate === "boolean" ? args.pauseAtGate : preset.pauseAtGate;
  const batchSize = Number(args.batchSize) > 0 ? Number(args.batchSize) : 40;
  const maxRounds = Number(args.maxRounds) > 0 ? Number(args.maxRounds) : 5;

  // Topology 3: Cyclic Discovery Loop (`discovery-loop`)
  if (topology === "cyclic-loop") {
    ctx.phase("Wave 2 / Discovery Loop");
    const seenKeys = new Set();
    const allSurvivors = [];
    const allDropped = [];
    const allMissingUnits = [];
    let emptyRounds = 0;
    let roundsExecuted = 0;

    for (let round = 1; round <= maxRounds; round++) {
      roundsExecuted = round;
      const priorKeys = Array.from(seenKeys);
      const finderResults = await ctx.parallel(
        units.map((unit, i) => () =>
          ctx.agent(
            `[Discovery Round ${round} | Finder ${i + 1}/${units.length}] Goal: ${goal}\n` +
              `Assigned Vector: ${unit}\n` +
              `Already discovered claim keys (DO NOT repeat): ${JSON.stringify(priorKeys)}\n` +
              `Return ONLY new candidate findings with concrete file:line or URL citations.`,
            {
              label: `finder:r${round}:${i}`,
              agent: "Vijay Agent",
              schema: FINDING_SCHEMA,
            },
          ),
        ),
      );

      const roundReduced = await ctx.step(`reduce-r${round}-v1`, () =>
        reduceWaveWithCountGuard(ctx, units, finderResults, seenKeys, `r${round}`),
      );

      for (const m of roundReduced.missingUnits) {
        if (!allMissingUnits.includes(m)) {
          allMissingUnits.push(m);
        }
      }

      const activeLenses = await selectVerifierLensesViaElJev(
        goal,
        roundReduced.uniqueClaims.length,
        defaultLenses,
        { useElJev: args.useElJev === true },
      );

      const verifiedRound = await verifyClaims(
        ctx,
        roundReduced.uniqueClaims,
        activeLenses,
        `r${round}`,
      );

      allSurvivors.push(...verifiedRound.survivors);
      allDropped.push(...verifiedRound.droppedClaims);

      if (verifiedRound.survivors.length === 0) {
        emptyRounds += 1;
        ctx.log(
          `[Discovery Loop] Round ${round} produced 0 new verified findings (consecutive empty rounds: ${emptyRounds}/2).`,
        );
      } else {
        emptyRounds = 0;
        ctx.log(
          `[Discovery Loop] Round ${round} produced ${verifiedRound.survivors.length} new verified findings.`,
        );
      }

      if (emptyRounds >= 2) {
        ctx.log(`[Discovery Loop] Stopping after ${round} rounds (2 consecutive rounds with 0 new verified findings).`);
        break;
      }
    }

    ctx.phase("Synthesize");
    const report = await synthesizeWithLayeredFanIn(
      ctx,
      goal,
      allSurvivors,
      allDropped,
      allMissingUnits,
      batchSize,
    );
    return {
      ...report,
      specId,
      topology,
      roundsExecuted,
    };
  }

  // Topology 2: Double-Diamond (`gtm-kit`)
  if (topology === "double-diamond") {
    ctx.phase("Split & Wave 1");
    const positioningDoc = await ctx.step("positioning-doc-v1", async () => {
      const wave1Raw = await ctx.parallel(
        units.map((unit, i) => () =>
          ctx.agent(
            `[Wave 1 Research Worker ${i + 1}/${units.length}] Goal: ${goal}\n` +
              `Assigned Research Slice: ${unit}\n` +
              `Return structured claims with verifiable sources.`,
            {
              label: `worker:w1:${i}`,
              agent: "Vijay Agent",
              schema: FINDING_SCHEMA,
            },
          ),
        ),
      );

      ctx.phase("Plain-Code Reduce & Count Guard");
      const reducedW1 = await ctx.step("reduce-w1-v1", () =>
        reduceWaveWithCountGuard(ctx, units, wave1Raw, new Set(), "w1"),
      );

      ctx.phase("Fresh-Context Verification");
      const activeLenses = await selectVerifierLensesViaElJev(
        goal,
        reducedW1.uniqueClaims.length,
        defaultLenses,
        { useElJev: args.useElJev === true },
      );
      const verifiedW1 = await verifyClaims(ctx, reducedW1.uniqueClaims, activeLenses, "w1");

      const posReport = await ctx.agent(
        `[Wave 1 Positioning Synthesizer] Lock the positioning document for goal: ${goal}\n` +
          `Verified research claims:\n${JSON.stringify(verifiedW1.survivors)}`,
        {
          label: "synth:positioning:v1",
          agent: "Vijay Agent",
          schema: REPORT_SCHEMA,
        },
      );

      return {
        summary: posReport?.summary || `Positioning locked for ${goal}`,
        verifiedClaims: posReport?.verifiedClaims || verifiedW1.survivors,
        droppedClaims: verifiedW1.droppedClaims,
        missingUnits: reducedW1.missingUnits,
      };
    });

    // Mandatory mid-graph human approval checkpoint
    await ctx.pause("approve-positioning-v1");

    ctx.phase("Wave 2 / Discovery Loop");
    const secondaryUnits =
      Array.isArray(args.secondaryUnits) && args.secondaryUnits.length > 0
        ? args.secondaryUnits
        : preset.defaultSecondaryUnits || [
            "pitch_deck: 5-slide executive narrative",
            "battlecard: Competitive counter-play card",
            "outbound_email: BLUF customer follow-up draft",
          ];

    const wave2Raw = await ctx.parallel(
      secondaryUnits.map((assetUnit, i) => () =>
        ctx.agent(
          `[Wave 2 Asset Writer ${i + 1}/${secondaryUnits.length}] Goal: ${goal}\n` +
            `Asset Spec: ${assetUnit}\n` +
            `Approved Positioning Document (MUST align strictly):\n${JSON.stringify(positioningDoc)}`,
          {
            label: `worker:w2:${i}`,
            agent: "Vijay Agent",
            schema: FINDING_SCHEMA,
          },
        ),
      ),
    );

    const reducedW2 = await ctx.step("reduce-w2-v1", () =>
      reduceWaveWithCountGuard(ctx, secondaryUnits, wave2Raw, new Set(), "w2"),
    );

    const verifiedW2 = await verifyClaims(ctx, reducedW2.uniqueClaims, ["correct"], "w2");

    ctx.phase("Synthesize");
    const finalKit = await synthesizeWithLayeredFanIn(
      ctx,
      goal,
      verifiedW2.survivors,
      [...(positioningDoc.droppedClaims || []), ...verifiedW2.droppedClaims],
      [...(positioningDoc.missingUnits || []), ...reducedW2.missingUnits],
      batchSize,
    );

    return {
      ...finalKit,
      specId,
      topology,
      positioningDoc,
    };
  }

  // Topology 1: Single-Diamond (`diamond` — `route-audit`, `research-desk`, `content-brief`, `refactor-sweep`)
  ctx.phase("Split & Wave 1");
  const wave1Results = await ctx.parallel(
    units.map((unit, i) => () =>
      ctx.agent(
        `[Diamond Worker ${i + 1}/${units.length}] Spec: ${specId} | Goal: ${goal}\n` +
          `Assigned Unit: ${unit}\n` +
          `Return structured claims with exact file:line, commit SHA, or URL citations.`,
        {
          label: `worker:w1:${i}`,
          agent: "Vijay Agent",
          schema: FINDING_SCHEMA,
        },
      ),
    ),
  );

  ctx.phase("Plain-Code Reduce & Count Guard");
  const reduced = await ctx.step("reduce-w1-v1", () =>
    reduceWaveWithCountGuard(ctx, units, wave1Results, new Set(), "w1"),
  );

  ctx.phase("Fresh-Context Verification");
  const activeLenses = await selectVerifierLensesViaElJev(
    goal,
    reduced.uniqueClaims.length,
    defaultLenses,
    { useElJev: args.useElJev === true },
  );
  const verified = await verifyClaims(ctx, reduced.uniqueClaims, activeLenses, "w1");

  if (pauseAtGate) {
    await ctx.pause("approve-synthesis-v1");
  }

  ctx.phase("Synthesize");
  const report = await synthesizeWithLayeredFanIn(
    ctx,
    goal,
    verified.survivors,
    verified.droppedClaims,
    reduced.missingUnits,
    batchSize,
  );

  return {
    ...report,
    specId,
    topology,
    returnedUnits: reduced.returnedUnits,
    totalUnits: reduced.totalUnits,
  };
}

const FROZEN_PATH_DIR_REGEX = /(?:^|[\\/])(?:tests?|benchmark|eval(?:s|uation)?|\.github[\\/]hooks)[\\/]/i;
const FROZEN_TEST_FILE_REGEX = /\.(?:test|spec)\.[jt]sx?$/i;
const WRITE_TOOLS = new Set(["edit", "create", "apply_patch"]);
const CITATION_REGEX = /(?:https?:\/\/\S+|:\d+\b|:line\b|\bcommit\b|\b[0-9a-f]{7,40}\b|\bunknown\b)/i;

function extractTargetPaths(toolArgs) {
  if (!toolArgs || typeof toolArgs !== "object") {
    return [];
  }
  const paths = [];
  for (const key of ["path", "file_path", "filePath", "targetFile"]) {
    if (typeof toolArgs[key] === "string" && toolArgs[key].trim()) {
      paths.push(toolArgs[key].trim());
    }
  }
  for (const patchKey of ["patch", "diff", "input"]) {
    if (typeof toolArgs[patchKey] === "string") {
      const matches = toolArgs[patchKey].matchAll(/(?:\*\*\* (?:Update|Add|Delete) File:\s*|[+-]{3} [ab]\/)([^\r\n]+)/g);
      for (const m of matches) {
        if (m[1]) {
          paths.push(m[1].trim());
        }
      }
    }
  }
  return paths;
}

export function isFrozenTestOrHookPath(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return false;
  }
  const normalized = filePath.trim();
  return FROZEN_PATH_DIR_REGEX.test(normalized) || FROZEN_TEST_FILE_REGEX.test(normalized);
}

/**
 * Create Copilot SDK lifecycle hooks for the Diamond Workflow extension.
 * Deliberately abstains (`undefined`) on `task`, `run_dynamic_workflow`, and `onUserPromptSubmitted`
 * so `el-mds` is never interfered with.
 */
export function createDiamondHooks(env = process.env) {
  return {
    onPreToolUse: async (input) => {
      if (env?.COPILOT_FREEZE_TESTS !== "1") {
        return undefined;
      }
      const toolName = String(input?.toolName || "");
      if (!WRITE_TOOLS.has(toolName)) {
        return undefined;
      }
      const targetPaths = extractTargetPaths(input?.toolArgs);
      const frozenHit = targetPaths.find((p) => isFrozenTestOrHookPath(p));
      if (!frozenHit) {
        return undefined;
      }
      return {
        permissionDecision: "deny",
        permissionDecisionReason: `[Frozen Rules Guard] Cannot modify frozen test/eval/hook file "${frozenHit}" when COPILOT_FREEZE_TESTS=1.`,
      };
    },

    onSubagentStart: async (input) => {
      const agentName = String(input?.agentName || input?.agentType || "").toLowerCase();
      if (agentName === "research" || agentName === "explore") {
        return {
          additionalContext:
            "[Node Contract Anchor] Return structured claims with exact file:line or URL citations and dates. Separate Verified, Inferred, and Unknown.",
        };
      }
      return undefined;
    },

    onSubagentStop: async (input) => {
      const agentName = String(input?.agentName || input?.agentType || "").toLowerCase();
      const response = typeof input?.response === "string" ? input.response.trim() : "";
      if (agentName === "research" && response.length > 0 && !CITATION_REGEX.test(response)) {
        return {
          decision: "block",
          reason:
            "[Verifier Gate] Attach exact file:line numbers, commit SHAs, or URLs (or mark Unknown) before completing.",
        };
      }
      return undefined;
    },
  };
}

export const createHooks = createDiamondHooks;
