---
name: diamond-workflow
description: "Orchestrate Diamond, Double-Diamond, and Cyclic Discovery Loop multi-agent workflows with plain-code deduplication, fan-in count guards, fresh-context 3-skeptic majority-vote verification, layered fan-in batching, and durable human gates. Use when running route audits, multi-angle research desks, content briefs, GTM kits, refactor sweeps, or iterative vulnerability and edge-case discovery loops."
user-invocable: true
---

# Diamond Workflow — Control Plane

Repeatable multi-agent graph execution using the **Diamond** (`Split -> Parallel Workers -> Plain-Code Reduce + Count Guard -> Fresh-Context Verifier -> Synthesize`), **Double-Diamond** (two Diamonds joined by a durable `ctx.pause` human gate), and **Cyclic Discovery Loop** topologies.

---

## Step 1 — Fake-Edge Test (Mandatory Pre-Flight)

Before launching any graph or subagent wave, evaluate the task against three gates:

1. **Direct-Tool Gate:** Can this be answered in 1–5 direct tool calls (`grep`, `glob`, `view`, single MCP query)? If **yes**, stop and execute directly. Do not spawn a graph.
2. **Serial Dependency Gate:** Does Worker B require Worker A's output to start (`A -> B -> C`)? If **yes**, run sequentially in a single context. Never wrap a serial chain in a fake parallel fan-out.
3. **Orthogonality Gate:** Do at least 2 independent units (files, research angles, accounts, modules) exist that can execute with zero shared mutable state? Only proceed to Step 2 when **true**.

---

## Step 2 — Map Request to Graph Spec

Read [`specs/graph-specs.md`](specs/graph-specs.md) and select the matching `specId`:

| `specId` | Topology | Default Use Case |
|---|---|---|
| `route-audit` | `diamond` | Audit API routes or handler files (1 worker/file, `code-review` verifier, cap 20 files) |
| `research-desk` | `diamond` | Deep technical or competitive research across 5 orthogonal angles + 3-skeptic majority vote |
| `content-brief` | `diamond` | Content or executive brief from 3 parallel research angles + unsourced-claim fact-checker |
| `gtm-kit` | `double-diamond` | Wave 1 research -> positioning doc -> `ctx.pause("approve-positioning-v1")` -> Wave 2 asset writers |
| `refactor-sweep` | `diamond` | Multi-file refactor for functions over 100 lines with git worktree isolation + count guard |
| `discovery-loop` | `cyclic-loop` | Iterative bug, vulnerability, or edge-case hunting; stops after 2 consecutive zero-new-finding rounds |

---

## Step 3 — Choose Execution Mode (Mode A vs Mode B)

### Mode A — Copilot SDK Dynamic Workflow (`diamond-engine`)

Use **Mode A** for compute, repository, code analysis, open-web research, and document synthesis graphs.

1. Check if `diamond-engine` is registered via `dynamic_workflows_manage({ operation: "list" })`.
2. If not registered in the current session, load `extension/workflow.mjs` and register `diamond-engine` via `dynamic_workflows_manage({ operation: "author", ... })` or `extensions_reload({})`.
3. Invoke `run_dynamic_workflow`:

```json
{
  "name": "diamond-engine",
  "args": {
    "specId": "research-desk",
    "topology": "diamond",
    "goal": "Evaluate Azure Container Apps vs AKS for multi-tenant SaaS in GCC",
    "units": [
      "What changed in the last 6 months",
      "Production architecture and scaling benchmarks",
      "Failure modes, quotas, and regional limitations",
      "Security, networking, and GCC compliance posture",
      "TCO and licensing mechanics"
    ],
    "secondaryUnits": [],
    "pauseAtGate": true,
    "batchSize": 40
  }
}
```

4. If `diamond-engine` pauses at a human gate (`status: "paused"`, e.g. `approve-positioning-v1` or `approve-synthesis-v1`), present the intermediate artifact to the user and resume with `run_dynamic_workflow({ resumeFromRunId: "<runId>" })` once approved.

---

### Mode B — Main-Session SQLite + `task(mode="sync")` Waves

Use **Mode B** when workers depend on main-session-only MCP servers (e.g., session-scoped CRM, mailbox, analytics, or knowledge-vault MCP tools) that are not exposed inside background SDK workflow subagents.

#### 1. Register the Diamond DAG in Session SQLite

```sql
INSERT INTO todos (id, title, description, status) VALUES
  ('w1-split', 'Splitting units into orthogonal worker prompts', 'Define disjoint scope per worker', 'done'),
  ('w1-workers', 'Running parallel worker wave', 'Dispatch one sync task per unit in a single turn', 'in_progress'),
  ('w1-reduce', 'Running SQLite fan-in count guard and deduplication', 'Verify worker quorum and dedupe claims', 'pending'),
  ('w1-verify', 'Verifying claims with fresh-context skeptic', 'Run rubber-duck or triage-team:skeptic on reduced claims', 'pending'),
  ('w1-synth', 'Synthesizing final verified deliverable', 'Merge surviving claims into final output', 'pending');

INSERT INTO todo_deps (todo_id, depends_on) VALUES
  ('w1-reduce', 'w1-workers'),
  ('w1-verify', 'w1-reduce'),
  ('w1-synth', 'w1-verify');
```

#### 2. Dispatch Parallel Workers with Unique Labels

Emit all worker `task` calls in a **single assistant response** (`agent_type: "Vijay Agent"` or specialist, self-contained 5-part delegation contract, structured `Claim | Source | Status` return format).

#### 3. Run the Arithmetic SQLite Fan-In Count Guard

Create a tracking table for the wave and verify quorum before synthesis:

```sql
CREATE TABLE IF NOT EXISTS diamond_wave_results (
  unit_id TEXT PRIMARY KEY,
  worker_label TEXT NOT NULL,
  status TEXT NOT NULL, -- 'ok' | 'null' | 'error'
  claim_count INTEGER DEFAULT 0
);

SELECT
  COUNT(*) AS total_units,
  SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS returned_units,
  SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END) AS missing_units,
  CASE
    WHEN SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) >= CAST((COUNT(*) + 1) / 2 AS INTEGER)
    THEN 'PASS'
    ELSE 'HALT_QUORUM_FAILURE'
  END AS quorum_gate
FROM diamond_wave_results;
```

- If `quorum_gate = 'HALT_QUORUM_FAILURE'`, **stop immediately** and report the failed units rather than synthesizing partial data.
- If `missing_units > 0` and `quorum_gate = 'PASS'`, list every missing unit in a dedicated `Unverified / Null Units` section of the final report.

#### 4. Fresh-Context Verification Before Synthesis

Pass the deduplicated claim list (never the raw worker transcripts) to a fresh-context verifier (`rubber-duck`, `triage-team:skeptic`, or `code-review`). Keep only claims that pass verification with concrete `file:line`, commit SHA, or URL citations.
