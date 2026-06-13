/**
 * シード付き決定論的RNG(mulberry32)。
 * 本プロジェクトの全乱数はこのモジュール経由でなければならない(ADR-0002)。
 * 同一シードから同一系列が再現されることがゴールデンマスターテストの前提。
 */
export interface Rng {
  /** [0, 1) の一様乱数 */
  next(): number;
  /** [min, max] の整数(両端含む) */
  nextInt(min: number, max: number): number;
  /** これまでに消費した乱数の個数(セーブ・リプレイ用) */
  consumed(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  let count = 0;
  return {
    next(): number {
      count++;
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(min: number, max: number): number {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new Error(`nextInt: 不正な範囲 [${min}, ${max}]`);
      }
      return min + Math.floor(this.next() * (max - min + 1));
    },
    consumed(): number {
      return count;
    },
  };
}

/**
 * チャンネル分離RNG。ロジック用と演出用で乱数列を分け、
 * 演出の追加・削除がゲーム結果に影響しないようにする(ADR-0002)。
 */
export function deriveRng(seed: number, channel: string): Rng {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < channel.length; i++) {
    h = Math.imul(h ^ channel.charCodeAt(i), 16777619) >>> 0;
  }
  return createRng((seed ^ h) >>> 0);
}

/** ロード時に乱数消費数まで状態を進める(中断セーブの再現用) */
export function restoreRng(seed: number, consumedCount: number): Rng {
  const rng = createRng(seed);
  for (let i = 0; i < consumedCount; i++) rng.next();
  return rng;
}
