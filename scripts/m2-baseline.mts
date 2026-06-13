/**
 * M2 バランスベースライン計測（qa-playtester 委任相当）
 * サンプル章 chapter01 をシード100種で自動プレイし勝率等を集計する。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BattleSession } from "../packages/runtime/src/game/BattleSession.js";
import { loadChapterFromDir } from "../packages/runtime/src/data/loadChapter.node.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_ROOT = resolve(ROOT, "templates/sample");
const SEEDS = Array.from({ length: 100 }, (_, i) => 10_000 + i);
const MAX_TURNS = 100;

interface RunResult {
  seed: number;
  outcome: "win" | "lose" | "ongoing";
  turns: number;
  steps: number;
}

function runSeed(seed: number): RunResult {
  const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
  const session = BattleSession.fromChapter(chapter, seed);
  const result = session.runAutoPlay(MAX_TURNS);
  return { seed, outcome: result.outcome, turns: result.turns, steps: result.steps };
}

function main(): void {
  const results = SEEDS.map(runSeed);
  const wins = results.filter((r) => r.outcome === "win").length;
  const losses = results.filter((r) => r.outcome === "lose").length;
  const deadlocks = results.filter((r) => r.outcome === "ongoing").length;
  const turnSamples = results.filter((r) => r.outcome !== "ongoing").map((r) => r.turns);
  const avgTurns =
    turnSamples.length > 0
      ? turnSamples.reduce((a, b) => a + b, 0) / turnSamples.length
      : 0;

  const report = `# M2 バランスベースライン

計測日: ${new Date().toISOString().slice(0, 10)}
対象: templates/sample/maps/chapter01.json
方式: 全陣営AI自動プレイ（BattleSession.runAutoPlay）
シード: ${SEEDS[0]}〜${SEEDS[SEEDS.length - 1]}（${SEEDS.length}本）
打ち切り: ${MAX_TURNS}ターン

## サマリー

| 指標 | 値 |
|------|-----|
| 勝率 | ${(wins / results.length * 100).toFixed(1)}% (${wins}/${results.length}) |
| 敗北率 | ${(losses / results.length * 100).toFixed(1)}% (${losses}/${results.length}) |
| デッドロック率 | ${(deadlocks / results.length * 100).toFixed(1)}% (${deadlocks}/${results.length}) |
| 平均ターン数（決着時） | ${avgTurns.toFixed(2)} |

## 所見

- デッドロック率が 0% であれば100ターン打ち切り以内に必ず決着している。
- 勝率が極端（0% / 100%）の場合は chapter01 の配置・ステータス見直しを検討。

## 生データ（先頭10件）

| seed | outcome | turns | steps |
|------|---------|-------|-------|
${results
  .slice(0, 10)
  .map((r) => `| ${r.seed} | ${r.outcome} | ${r.turns} | ${r.steps} |`)
  .join("\n")}
`;

  const outDir = resolve(ROOT, "docs/reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "M2-baseline.md");
  writeFileSync(outPath, report);
  console.log(`baseline: ${outPath}`);
  console.log(`win=${wins} lose=${losses} deadlock=${deadlocks} avgTurns=${avgTurns.toFixed(2)}`);
}

main();
