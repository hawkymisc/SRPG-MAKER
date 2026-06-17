import { Howl } from "howler";
import { bgmAssetSources, seAssetSources } from "./audioPaths.js";

const BGM_CROSSFADE_MS = 400;

export interface GameAudioOptions {
  /** Skip playback (headless auto-play / tests). */
  muted?: boolean;
  /** Record playBgm/playSe ids for E2E assertions. */
  recordCalls?: boolean;
}

export interface GameAudioCallLog {
  bgm: string[];
  se: string[];
}

export class GameAudio {
  private readonly muted: boolean;
  private readonly recordCalls: boolean;
  private readonly callLog: GameAudioCallLog = { bgm: [], se: [] };
  private currentBgm: Howl | null = null;
  private currentBgmId: string | null = null;

  constructor(
    private readonly baseUrl: string,
    options: GameAudioOptions = {},
  ) {
    this.muted = options.muted ?? false;
    this.recordCalls = options.recordCalls ?? false;
  }

  getCallLog(): GameAudioCallLog {
    return {
      bgm: [...this.callLog.bgm],
      se: [...this.callLog.se],
    };
  }

  clearCallLog(): void {
    this.callLog.bgm.length = 0;
    this.callLog.se.length = 0;
  }

  async playBgm(bgmId: string, fadeInMs?: number): Promise<void> {
    if (this.recordCalls) {
      this.callLog.bgm.push(bgmId);
    }
    if (this.muted) {
      return;
    }
    if (this.currentBgmId === bgmId && this.currentBgm?.playing()) {
      return;
    }

    const previous = this.currentBgm;
    const next = this.createHowl(bgmAssetSources(this.baseUrl, bgmId), { loop: true, volume: 1 });
    this.currentBgm = next;
    this.currentBgmId = bgmId;

    if (fadeInMs !== undefined && fadeInMs > 0) {
      next.volume(0);
      next.play();
      next.fade(0, 1, fadeInMs);
      this.fadeOutAndUnload(previous, BGM_CROSSFADE_MS);
      await this.waitMs(fadeInMs);
      return;
    }

    next.play();
    this.fadeOutAndUnload(previous, BGM_CROSSFADE_MS);
  }

  playSe(seId: string): void {
    if (this.recordCalls) {
      this.callLog.se.push(seId);
    }
    if (this.muted) {
      return;
    }
    const se = this.createHowl(seAssetSources(this.baseUrl, seId), { loop: false, volume: 1 });
    se.once("end", () => {
      se.unload();
    });
    se.once("loaderror", () => {
      se.unload();
    });
    se.play();
  }

  stopBgm(): void {
    this.fadeOutAndUnload(this.currentBgm, BGM_CROSSFADE_MS);
    this.currentBgm = null;
    this.currentBgmId = null;
  }

  destroy(): void {
    this.stopBgm();
  }

  private createHowl(
    src: string[],
    options: { loop: boolean; volume: number },
  ): Howl {
    return new Howl({
      src,
      loop: options.loop,
      volume: options.volume,
      html5: options.loop,
      preload: true,
      onloaderror: () => {
        // Missing assets are allowed; creators add files under assets/audio/.
      },
    });
  }

  private fadeOutAndUnload(howl: Howl | null, durationMs: number): void {
    if (!howl) {
      return;
    }
    const from = howl.volume();
    howl.fade(from, 0, durationMs);
    howl.once("fade", () => {
      howl.stop();
      howl.unload();
    });
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
