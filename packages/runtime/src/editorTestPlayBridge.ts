import { EDITOR_TESTPLAY_KEY } from "./data/loadChapter.js";
import { createPhaserGame } from "./game/createGame.js";

export const EDITOR_TESTPLAY_MESSAGE = "srpg-editor-testplay" as const;

export interface EditorTestPlayMessage {
  type: typeof EDITOR_TESTPLAY_MESSAGE;
  payload: string;
}

export function installEditorTestPlayBridge(): void {
  window.addEventListener("message", (event) => {
    const data = event.data as Partial<EditorTestPlayMessage> | null;
    if (!data || data.type !== EDITOR_TESTPLAY_MESSAGE || typeof data.payload !== "string") {
      return;
    }
    try {
      sessionStorage.setItem(EDITOR_TESTPLAY_KEY, data.payload);
    } catch {
      // ignore quota / private mode
    }
  });
}

function waitForEditorPayload(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (sessionStorage.getItem(EDITOR_TESTPLAY_KEY)) {
      resolve();
      return;
    }
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as Partial<EditorTestPlayMessage> | null;
      if (data?.type === EDITOR_TESTPLAY_MESSAGE) {
        cleanup();
        resolve();
      }
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    window.addEventListener("message", onMessage);
  });
}

export async function bootstrapRuntime(host: HTMLElement): Promise<void> {
  installEditorTestPlayBridge();
  const params = new URLSearchParams(window.location.search);
  if (params.has("editorTestPlay")) {
    await waitForEditorPayload(3_000);
  }
  createPhaserGame(host);
}
