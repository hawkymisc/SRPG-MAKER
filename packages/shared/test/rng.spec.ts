import { describe, expect, it } from "vitest";
import { createRng, deriveRng, restoreRng } from "../src/rng.js";

describe("createRng(決定論)", () => {
  it("同一シードは同一系列を生成する", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("異なるシードは異なる系列を生成する", () => {
    const a = Array.from({ length: 100 }, () => createRng(1).next());
    const seq1 = Array.from({ length: 100 }, () => createRng(2).next());
    expect(a).not.toEqual(seq1);
  });

  it("next() は [0, 1) に収まる", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt は両端を含む範囲を返し、全値が出現する", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 10000; i++) {
      const v = rng.nextInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it("nextInt は不正な範囲で例外を投げる", () => {
    expect(() => createRng(1).nextInt(5, 1)).toThrow();
    expect(() => createRng(1).nextInt(0.5, 2)).toThrow();
  });

  it("consumed() が消費数を正確に数える", () => {
    const rng = createRng(9);
    rng.next();
    rng.nextInt(1, 10);
    expect(rng.consumed()).toBe(2);
  });
});

describe("deriveRng(チャンネル分離)", () => {
  it("同一シード・同一チャンネルは再現し、チャンネルが違えば系列が変わる", () => {
    const logic1 = Array.from({ length: 50 }, () => deriveRng(42, "logic").next());
    const logic2 = Array.from({ length: 50 }, () => deriveRng(42, "logic").next());
    const fx = Array.from({ length: 50 }, () => deriveRng(42, "fx").next());
    expect(logic1).toEqual(logic2);
    expect(logic1).not.toEqual(fx);
  });
});

describe("restoreRng(中断セーブ再現)", () => {
  it("消費数まで進めた状態が、連続実行と一致する", () => {
    const original = createRng(123);
    for (let i = 0; i < 57; i++) original.next();
    const restored = restoreRng(123, 57);
    for (let i = 0; i < 100; i++) {
      expect(restored.next()).toBe(original.next());
    }
  });
});
