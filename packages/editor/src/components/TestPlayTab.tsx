import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store/projectStore.js";
import { buildChapterPayload, serializeChapterPayload, storeChapterPayload } from "../lib/project/testPlay.js";

const EDITOR_TESTPLAY_MESSAGE = "srpg-editor-testplay" as const;

interface RuntimeStateSnapshot {
  turn: number;
  phase: string;
  mode: string;
}

interface RuntimeTestApiLite {
  getState: () => { turn: number; phase: string };
  getMode: () => string;
}

declare global {
  interface Window {
    __RUNTIME_TEST__?: RuntimeTestApiLite;
  }
}

export function TestPlayTab() {
  const project = useProjectStore((s) => s.project);
  const selectedMapId = useProjectStore((s) => s.selectedMapId);
  const selectedChapterId = useProjectStore((s) => s.selectedChapterId);
  const seed = useProjectStore((s) => s.testPlaySeed);
  const invincible = useProjectStore((s) => s.testPlayInvincible);
  const runtimeUrl = useProjectStore((s) => s.runtimeUrl);
  const setTestPlaySeed = useProjectStore((s) => s.setTestPlaySeed);
  const setTestPlayInvincible = useProjectStore((s) => s.setTestPlayInvincible);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [running, setRunning] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeStateSnapshot | null>(null);

  const pollRuntimeState = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const api = iframe.contentWindow.__RUNTIME_TEST__;
      if (!api) return;
      const state = api.getState();
      setRuntimeState({
        turn: state.turn,
        phase: state.phase,
        mode: api.getMode(),
      });
    } catch {
      // cross-origin until loaded
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(pollRuntimeState, 500);
    return () => window.clearInterval(id);
  }, [running, pollRuntimeState]);

  const launch = (target: "iframe" | "window") => {
    if (!project || !selectedMapId) return;
    const payload = buildChapterPayload(project, selectedMapId, seed, { invincible });
    const serialized = serializeChapterPayload(payload);
    storeChapterPayload(payload);
    const url = `${runtimeUrl}/?editorTestPlay=1`;
    if (target === "window") {
      const child = window.open(url, "_blank", "noopener,noreferrer");
      if (child) {
        const post = () => {
          child.postMessage({ type: EDITOR_TESTPLAY_MESSAGE, payload: serialized }, runtimeUrl);
        };
        child.addEventListener("load", post);
        window.setTimeout(post, 500);
      }
    } else {
      setRunning(true);
      const iframe = iframeRef.current;
      if (iframe) {
        const post = () => {
          iframe.contentWindow?.postMessage(
            { type: EDITOR_TESTPLAY_MESSAGE, payload: serialized },
            runtimeUrl,
          );
        };
        iframe.addEventListener("load", post, { once: true });
        iframe.src = url;
        window.setTimeout(post, 500);
      }
    }
  };

  if (!project) {
    return <p data-testid="testplay-tab">プロジェクトを読み込んでください。</p>;
  }

  return (
    <section className="panel testplay-panel" data-testid="testplay-tab">
      <h2>テストプレイ</h2>
      <p>
        章:{" "}
        <strong data-testid="testplay-chapter-id">
          {selectedChapterId ?? "未選択"}
        </strong>
        {" / マップ: "}
        <strong data-testid="testplay-map-id">{selectedMapId ?? "未選択"}</strong>
      </p>
      <div className="debug-panel" data-testid="debug-panel">
        <label>
          シード（固定再生）
          <input
            type="number"
            value={seed}
            onChange={(e) => setTestPlaySeed(Number(e.target.value))}
            data-testid="debug-seed"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={invincible}
            onChange={(e) => setTestPlayInvincible(e.target.checked)}
            data-testid="debug-invincible"
          />
          無敵（デバッグ）
        </label>
        {runtimeState ? (
          <dl data-testid="debug-variables">
            <dt>ターン</dt>
            <dd>{runtimeState.turn}</dd>
            <dt>フェーズ</dt>
            <dd>{runtimeState.phase}</dd>
            <dt>モード</dt>
            <dd>{runtimeState.mode}</dd>
          </dl>
        ) : (
          <p className="hint">ランタイム起動後に変数を表示します。</p>
        )}
      </div>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => launch("iframe")}
          disabled={!selectedMapId}
          data-testid="btn-testplay-iframe"
        >
          埋め込み起動
        </button>
        <button
          type="button"
          onClick={() => launch("window")}
          disabled={!selectedMapId}
          data-testid="btn-testplay-window"
        >
          別ウィンドウ起動
        </button>
        <button type="button" onClick={pollRuntimeState} data-testid="btn-refresh-debug">
          変数更新
        </button>
      </div>
      <iframe
        ref={iframeRef}
        title="SRPG Runtime Test Play"
        className="runtime-frame"
        data-testid="runtime-iframe"
      />
    </section>
  );
}
