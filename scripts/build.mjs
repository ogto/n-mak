import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const isVercel = process.env.VERCEL === "1";
const cliPath = isVercel
  ? require.resolve("next/dist/bin/next")
  : join(dirname(fileURLToPath(import.meta.resolve("vinext"))), "cli.js");
const builder = isVercel ? "Next.js" : "Vinext";

console.log(`Building with ${builder}...`);

const result = spawnSync(process.execPath, [cliPath, "build"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
