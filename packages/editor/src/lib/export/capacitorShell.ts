import { sanitizePackageSlug } from "./electronShell.js";

export interface CapacitorShellFiles {
  "capacitor.config.json": string;
  "package.json": string;
  "README.txt": string;
}

export function buildCapacitorShellFiles(projectName: string): CapacitorShellFiles {
  const slug = sanitizePackageSlug(projectName);
  const appId = `com.srpgmaker.${slug.replace(/-/g, "")}`;

  const capacitorConfig = {
    appId,
    appName: projectName,
    webDir: "www",
    bundledWebRuntime: false,
    server: {
      androidScheme: "https",
    },
  };

  const packageJson = {
    name: slug,
    version: "1.0.0",
    private: true,
    description: `${projectName} — SRPGツクール モバイル書き出し`,
    scripts: {
      "cap:sync": "npx cap sync",
      "cap:android": "npx cap open android",
      "cap:ios": "npx cap open ios",
      "cap:add:android": "npx cap add android",
      "cap:add:ios": "npx cap add ios",
    },
    dependencies: {
      "@capacitor/android": "^7.2.0",
      "@capacitor/core": "^7.2.0",
      "@capacitor/ios": "^7.2.0",
    },
    devDependencies: {
      "@capacitor/cli": "^7.2.0",
    },
  };

  const readme = [
    `${projectName} — Capacitor モバイル版 (iOS / Android)`,
    "",
    "前提: Node.js 22+、Android Studio または Xcode (iOS)",
    "",
    "1. このフォルダを展開する",
    "2. npm install",
    "3. npm run cap:add:android   … Android プロジェクトを生成 (初回のみ)",
    "   npm run cap:add:ios       … iOS プロジェクトを生成 (macOS + Xcode、初回のみ)",
    "4. npm run cap:sync          … www/ をネイティブプロジェクトへ同期",
    "5. npm run cap:android       … Android Studio で開く",
    "   npm run cap:ios           … Xcode で開く",
    "",
    "ゲーム本体は www/ 以下（HTML5ランタイム + プロジェクトデータ）です。",
    "ストア配布前に appId / アイコン / スプラッシュを capacitor.config.json と",
    "android/app / ios/App で設定してください。",
  ].join("\n");

  return {
    "capacitor.config.json": `${JSON.stringify(capacitorConfig, null, 2)}\n`,
    "package.json": `${JSON.stringify(packageJson, null, 2)}\n`,
    "README.txt": `${readme}\n`,
  };
}
