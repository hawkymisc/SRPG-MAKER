import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFolderFiles, readFolderPayload, writeFolderFiles, writeFolderPayload } from "./projectFs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EDITOR_WIDTH = 1280;
const EDITOR_HEIGHT = 800;

function resolveEditorUrl() {
  if (process.env.SRPG_EDITOR_URL) {
    return process.env.SRPG_EDITOR_URL;
  }
  return null;
}

function resolveEditorFile() {
  return path.join(__dirname, "../editor/dist/index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: EDITOR_WIDTH,
    height: EDITOR_HEIGHT,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const editorUrl = resolveEditorUrl();
  if (editorUrl) {
    void win.loadURL(editorUrl);
  } else {
    void win.loadFile(resolveEditorFile());
  }
}

app.whenReady().then(() => {
  ipcMain.handle("pick-open-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("pick-open-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "SRPG Project", extensions: ["json"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("pick-save-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "プロジェクトフォルダを選択",
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("pick-save-file", async (_event, defaultName) => {
    const result = await dialog.showSaveDialog({
      defaultPath: typeof defaultName === "string" ? defaultName : "project.json",
      filters: [{ name: "SRPG Project", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  ipcMain.handle("read-folder-files", async (_event, dirPath) => {
    if (typeof dirPath !== "string" || dirPath.length === 0) {
      throw new Error("Invalid folder path");
    }
    return readFolderPayload(dirPath);
  });

  ipcMain.handle("write-folder-files", async (_event, dirPath, payload) => {
    if (typeof dirPath !== "string" || dirPath.length === 0) {
      throw new Error("Invalid folder path");
    }
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Invalid folder payload");
    }
    await writeFolderPayload(dirPath, payload);
  });

  ipcMain.handle("read-text-file", async (_event, filePath) => {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("Invalid file path");
    }
    return fs.readFile(filePath, "utf8");
  });

  ipcMain.handle("write-text-file", async (_event, filePath, content) => {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("Invalid file path");
    }
    if (typeof content !== "string") {
      throw new Error("Invalid file content");
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
