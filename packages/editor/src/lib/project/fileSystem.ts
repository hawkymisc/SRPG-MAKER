import type { Project } from "@srpg/shared";
import { parseProjectJson, serializeProject } from "./serialize.js";
import { assertValidProject } from "./validate.js";

export interface OpenedProject {
  name: string;
  project: Project;
}

export interface ProjectFileSystem {
  openProject(): Promise<OpenedProject | null>;
  saveProject(project: Project, fileName: string): Promise<void>;
  pickSaveAsName(defaultName: string): Promise<string | null>;
}

export interface BrowserFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

export function createBrowserFileSystem(): ProjectFileSystem {
  return {
    async openProject() {
      if (!("showOpenFilePicker" in window)) {
        return null;
      }
      try {
        const [handle] = await (window as Window & {
          showOpenFilePicker: (opts: object) => Promise<BrowserFileHandle[]>;
        }).showOpenFilePicker({
          types: [{ description: "SRPG Project", accept: { "application/json": [".json"] } }],
          multiple: false,
        });
        if (!handle) return null;
        const file = await handle.getFile();
        const text = await file.text();
        return { name: handle.name, project: parseProjectJson(text) };
      } catch {
        return null;
      }
    },

    async saveProject(project, fileName) {
      if (!("showSaveFilePicker" in window)) {
        throw new Error("File System Access API is not available");
      }
      const handle = await (window as Window & {
        showSaveFilePicker: (opts: object) => Promise<BrowserFileHandle>;
      }).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "SRPG Project", accept: { "application/json": [".json"] } }],
      });
      const content = serializeProject(assertValidProject(project));
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    },

    async pickSaveAsName(defaultName) {
      return defaultName;
    },
  };
}

export class MemoryFileSystem implements ProjectFileSystem {
  public files = new Map<string, string>();

  async openProject(): Promise<OpenedProject | null> {
    const first = this.files.entries().next();
    if (first.done) return null;
    const [name, content] = first.value;
    return { name, project: parseProjectJson(content) };
  }

  async saveProject(project: Project, fileName: string): Promise<void> {
    this.files.set(fileName, serializeProject(assertValidProject(project)));
  }

  async pickSaveAsName(defaultName: string): Promise<string | null> {
    return defaultName;
  }
}
