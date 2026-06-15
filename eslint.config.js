import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "e2e/fixtures/**", "packages/runtime/dist/**", "packages/editor-electron/**"] },
  ...tseslint.configs.recommended,
  {
    // 絶対規約1: 決定論 — 非決定的APIの直接使用を全パッケージで禁止
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "決定論規約違反。shared/src/rng.ts のシード付きRNGを注入して使うこと。" },
        { object: "Date", property: "now", message: "決定論規約違反。時刻が必要なら引数で注入すること。" },
        { object: "crypto", property: "randomUUID", message: "決定論規約違反。IDはRNG経由か明示的な採番で生成すること。" }
      ],
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    // 絶対規約2: 純粋関数境界 — shared は描画・IO依存を持てない
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["phaser", "phaser/*"], message: "shared から Phaser への依存は禁止(runtimeへ)。" },
            { group: ["react", "react-*", "react/*"], message: "shared から React への依存は禁止(editorへ)。" },
            { group: ["electron", "electron/*"], message: "shared から Electron への依存は禁止。" },
            { group: ["node:*", "fs", "path", "os", "child_process"], message: "shared から Node API への依存は禁止(純粋関数のみ)。" }
          ]
        }
      ]
    }
  }
);
