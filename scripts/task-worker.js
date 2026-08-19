import * as nextEnvModule from "@next/env";

// @next/env is CommonJS today; namespace import works in both native Node
// ESM (where it is exposed under default) and tsx's CommonJS transform.
const loadEnvConfig = nextEnvModule.loadEnvConfig
  || nextEnvModule.default?.loadEnvConfig
  || nextEnvModule["module.exports"]?.loadEnvConfig;
if (typeof loadEnvConfig !== "function") throw new Error("Unable to load @next/env");

// Standalone workers do not pass through Next's server bootstrap.  Load the
// same .env* precedence before importing modules that create the DB pool or
// read execution settings.
loadEnvConfig(process.cwd());

// Keep this entry point compatible with tsx's default CommonJS transform.
// Dynamic import still loads the ESM execution graph after dotenv has run.
import("../src/lib/task-worker.js")
  .then(({ runWorker }) => runWorker())
  .catch((error) => {
    console.error("[worker] fatal:", error);
    process.exitCode = 1;
  });
