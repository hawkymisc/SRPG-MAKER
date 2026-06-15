import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["--filter", "@srpg/editor-electron", "dev"],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      SRPG_EDITOR_URL: "http://localhost:5173",
    },
  },
);

process.exit(result.status ?? 1);
