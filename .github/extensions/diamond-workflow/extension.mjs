import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension";
import { diamondMetadata, runDiamondEngine, createDiamondHooks } from "./workflow.mjs";

export const diamondEngine = defineWorkflow({
  meta: diamondMetadata,
  run: async (ctx) => JSON.parse(JSON.stringify((await runDiamondEngine(ctx)) ?? null)),
});

if (process.env.DIAMOND_EXTENSION_NO_AUTOJOIN !== "1") {
  await joinSession({
    workflows: [diamondEngine],
    hooks: createDiamondHooks(),
  });
}
