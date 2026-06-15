import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("srpgElectron", {
  isElectron: true,
  pickOpenFolder: () => ipcRenderer.invoke("pick-open-folder"),
  pickOpenFile: () => ipcRenderer.invoke("pick-open-file"),
  pickSaveFolder: () => ipcRenderer.invoke("pick-save-folder"),
  pickSaveFile: (defaultName) => ipcRenderer.invoke("pick-save-file", defaultName),
  readFolderFiles: (dirPath) => ipcRenderer.invoke("read-folder-files", dirPath),
  writeFolderFiles: (dirPath, files) => ipcRenderer.invoke("write-folder-files", dirPath, files),
  readTextFile: (filePath) => ipcRenderer.invoke("read-text-file", filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke("write-text-file", filePath, content),
});
