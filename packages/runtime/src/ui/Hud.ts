import type { BattleLogEntry, BattleState, Faction } from "@srpg/shared";
import { MAP_PX } from "../constants.js";

const PHASE_LABEL: Record<Faction, string> = {
  player: "自軍",
  enemy: "敵軍",
  third: "第三陣営",
};

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly phaseEl: HTMLDivElement;
  private readonly turnEl: HTMLDivElement;
  private readonly logEl: HTMLDivElement;
  private readonly outcomeEl: HTMLDivElement;
  private readonly saveEl: HTMLDivElement;

  constructor(parent: HTMLElement, hudOffsetX: number) {
    this.root = document.createElement("div");
    this.root.className = "srpg-hud";
    this.root.style.cssText = [
      "position:absolute",
      `left:${hudOffsetX}px`,
      "top:0",
      "width:148px",
      "height:100%",
      "padding:8px",
      "box-sizing:border-box",
      "background:#1a1a2e",
      "color:#eee",
      "font:12px monospace",
      "z-index:10",
    ].join(";");

    this.phaseEl = document.createElement("div");
    this.turnEl = document.createElement("div");
    this.saveEl = document.createElement("div");
    this.logEl = document.createElement("div");
    this.outcomeEl = document.createElement("div");

    this.logEl.style.cssText =
      "margin-top:8px;height:180px;overflow:auto;border-top:1px solid #444;padding-top:4px;font-size:11px;";
    this.outcomeEl.style.cssText =
      "margin-top:8px;color:#ffd54f;font-weight:bold;min-height:20px;";
    this.saveEl.style.cssText = "margin-top:8px;font-size:11px;color:#90caf9;";

    this.root.append(this.phaseEl, this.turnEl, this.saveEl, this.logEl, this.outcomeEl);
    parent.appendChild(this.root);
  }

  update(state: BattleState, recentLogs: BattleLogEntry[], hasSave: boolean): void {
    this.phaseEl.textContent = `フェイズ: ${PHASE_LABEL[state.phase]}`;
    this.turnEl.textContent = `ターン: ${state.turn}`;
    this.saveEl.textContent = hasSave ? "セーブ: あり (Ctrl+L)" : "セーブ: なし";
    this.logEl.innerHTML = recentLogs
      .slice(-8)
      .map((l) => `<div>${escapeHtml(l.message)}</div>`)
      .join("");
    if (state.outcome === "win") {
      this.outcomeEl.textContent = "★ 勝利 ★";
    } else if (state.outcome === "lose") {
      this.outcomeEl.textContent = "× 敗北 ×";
    } else {
      this.outcomeEl.textContent = "";
    }
  }

  setStatus(text: string): void {
    this.outcomeEl.textContent = text;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createStatusBar(parent: HTMLElement): HTMLDivElement {
  const bar = document.createElement("div");
  bar.className = "srpg-status-bar";
  bar.style.cssText = [
    "position:absolute",
    "left:0",
    `top:${MAP_PX}px`,
    `width:${MAP_PX}px`,
    "height:48px",
    "background:#111",
    "color:#ccc",
    "font:11px monospace",
    "padding:6px 8px",
    "box-sizing:border-box",
    "z-index:10",
  ].join(";");
  bar.textContent = "矢印/WASD: 移動 | Enter/Z: 決定 | X/Esc: 取消 | Ctrl+S/L: セーブ/ロード";
  parent.appendChild(bar);
  return bar;
}
