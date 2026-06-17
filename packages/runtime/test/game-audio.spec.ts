import { beforeEach, describe, expect, it, vi } from "vitest";

const play = vi.fn();
const fade = vi.fn();
const stop = vi.fn();
const unload = vi.fn();
const volume = vi.fn(() => 1);
const playing = vi.fn(() => false);
const once = vi.fn();

vi.mock("howler", () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play,
    fade,
    stop,
    unload,
    volume,
    playing,
    once,
  })),
}));

import { Howl } from "howler";
import { GameAudio } from "../src/audio/GameAudio.js";

describe("GameAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playing.mockReturnValue(false);
  });

  it("skips playback when muted", async () => {
    const audio = new GameAudio("http://test", { muted: true });
    await audio.playBgm("bgm_intro");
    audio.playSe("se_hit");
    expect(Howl).not.toHaveBeenCalled();
  });

  it("records call ids when recordCalls is enabled", async () => {
    const audio = new GameAudio("http://test", { muted: true, recordCalls: true });
    await audio.playBgm("bgm_intro");
    audio.playSe("se_hit");
    expect(audio.getCallLog()).toEqual({ bgm: ["bgm_intro"], se: ["se_hit"] });
  });

  it("plays BGM with Howl loop", async () => {
    const audio = new GameAudio("http://test");
    await audio.playBgm("bgm_battle");
    expect(Howl).toHaveBeenCalledWith(
      expect.objectContaining({
        src: [
          "http://test/assets/audio/bgm/bgm_battle.ogg",
          "http://test/assets/audio/bgm/bgm_battle.mp3",
        ],
        loop: true,
      }),
    );
    expect(play).toHaveBeenCalled();
  });

  it("plays SE without loop", () => {
    const audio = new GameAudio("http://test");
    audio.playSe("se_select");
    expect(Howl).toHaveBeenCalledWith(
      expect.objectContaining({
        loop: false,
      }),
    );
    expect(play).toHaveBeenCalled();
  });
});
