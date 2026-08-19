// Backwards-compatible entry point. The old worker accepted plaintext values
// from `signers.secret_ref`; all execution now goes through the encrypted vault
// and the shared scheduler in src/lib/task-worker.js.
import * as nextEnvModule from "@next/env";

// @next/env is CommonJS today; namespace import works in both native Node
// ESM (where it is exposed under default) and tsx's CommonJS transform.
const loadEnvConfig = nextEnvModule.loadEnvConfig
  || nextEnvModule.default?.loadEnvConfig
  || nextEnvModule["module.exports"]?.loadEnvConfig;
if (typeof loadEnvConfig !== "function") throw new Error("Unable to load @next/env");

// Keep the backwards-compatible entry point aligned with the primary worker:
// load environment files before importing the execution graph.
loadEnvConfig(process.cwd());

// Use the same promise-based bootstrap as the tsx entry point so both
// supervised worker commands share identical environment ordering.
import("../src/lib/task-worker.js")
  .then(({ runWorker }) => runWorker())
  .catch((error) => {
    console.error("[worker] fatal:", error);
    process.exitCode = 1;
  });
