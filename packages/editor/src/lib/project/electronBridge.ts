/** Preload (`packages/editor-electron/preload.mjs`) が注入する API。 */
export interface SrpgElectronBridge {
  isElectron: true;
  pickOpenFolder(): Promise<string | null>;
  pickOpenFile(): Promise<string | null>;
  pickSaveFolder(): Promise<string | null>;
  pickSaveFile(defaultName: string): Promise<string | null>;
  readFolderFiles(dirPath: string): Promise<Record<string, string>>;
  writeFolderFiles(dirPath: string, files: Record<string, string>): Promise<void>;
  readTextFile(filePath: string): Promise<string>;
  writeTextFile(filePath: string, content: string): Promise<void>;
}

declare global {
  interface Window {
    srpgElectron?: SrpgElectronBridge;
  }
}

export function getElectronBridge(): SrpgElectronBridge | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.srpgElectron?.isElectron ? window.srpgElectron : undefined;
}
