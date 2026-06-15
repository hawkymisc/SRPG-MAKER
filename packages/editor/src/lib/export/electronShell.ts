export interface ElectronShellFiles {
  "main.mjs": string;
  "preload.mjs": string;
  "package.json": string;
  "README.txt": string;
}

export function sanitizePackageSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "srpg-game";
}

export function buildElectronShellFiles(projectName: string): ElectronShellFiles {
  const slug = sanitizePackageSlug(projectName);
  const appId = `com.srpgmaker.${slug.replace(/-/g, "")}`;

  const mainMjs = `import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_WIDTH = 480;
const GAME_HEIGHT = 368;

function createWindow() {
  const win = new BrowserWindow({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    minWidth: GAME_WIDTH,
    minHeight: GAME_HEIGHT,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void win.loadFile(path.join(__dirname, "game", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
`;

  const preloadMjs = `// Preload script (contextIsolation enabled). Extend here for future desktop APIs.
`;

  const packageJson = {
    name: slug,
    version: "1.0.0",
    private: true,
    type: "module",
    main: "main.mjs",
    description: `${projectName} — SRPGツクール書き出し`,
    scripts: {
      start: "electron .",
      dist: "electron-builder --publish never",
    },
    devDependencies: {
      electron: "^34.5.8",
      "electron-builder": "^25.1.8",
    },
    build: {
      appId,
      productName: projectName,
      directories: { output: "dist" },
      files: ["main.mjs", "preload.mjs", "game/**"],
      win: { target: ["portable"] },
      mac: { target: ["dmg"] },
      linux: { target: ["AppImage"] },
    },
  };

  const readme = [
    `${projectName} — Electron デスクトップ版`,
    "",
    "前提: Node.js 22+",
    "",
    "1. このフォルダを展開する",
    "2. npm install",
    "3. npm start        … デスクトップで起動",
    "4. npm run dist     … Win/mac/Linux 向け配布物を dist/ に生成",
    "",
    "ゲーム本体は game/ 以下（HTML5書き出しと同じ構成）です。",
  ].join("\n");

  return {
    "main.mjs": mainMjs,
    "preload.mjs": preloadMjs,
    "package.json": `${JSON.stringify(packageJson, null, 2)}\n`,
    "README.txt": `${readme}\n`,
  };
}
