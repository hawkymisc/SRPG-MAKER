import type { Project } from "@srpg/shared";
import { parseProjectJson, serializeProject } from "./serialize.js";
import { assertValidProject } from "./validate.js";

export type ProjectStorageKind = "json" | "folder";

export interface ProjectSaveTarget {
  fileName: string;
  storageKind: ProjectStorageKind;
  projectLocation: string | null;
}

export interface OpenedProject {
  name: string;
  project: Project;
  storageKind: ProjectStorageKind;
  projectLocation: string | null;
}

export interface ProjectFileSystem {
  readonly nativeFolder: boolean;
  openProject(): Promise<OpenedProject | null>;
  saveProject(project: Project, target: ProjectSaveTarget): Promise<ProjectSaveTarget>;
}

export interface BrowserFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

export function createBrowserFileSystem(): ProjectFileSystem {
  return {
    nativeFolder: false,

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
        return {
          name: handle.name,
          project: parseProjectJson(text),
          storageKind: "json",
          projectLocation: null,
        };
      } catch {
        return null;
      }
    },

    async saveProject(project, target) {
      if (!("showSaveFilePicker" in window)) {
        throw new Error("File System Access API is not available");
      }
      const handle = await (window as Window & {
        showSaveFilePicker: (opts: object) => Promise<BrowserFileHandle>;
      }).showSaveFilePicker({
        suggestedName: target.fileName,
        types: [{ description: "SRPG Project", accept: { "application/json": [".json"] } }],
      });
      const content = serializeProject(assertValidProject(project));
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return {
        fileName: handle.name,
        storageKind: "json",
        projectLocation: null,
      };
    },
  };
}

export class MemoryFileSystem implements ProjectFileSystem {
  readonly nativeFolder: boolean;
  public files = new Map<string, string>();
  public folders = new Map<string, Record<string, string>>();

  constructor(options: { nativeFolder?: boolean } = {}) {
    this.nativeFolder = options.nativeFolder ?? false;
  }

  async openProject(): Promise<OpenedProject | null> {
    const firstFolder = this.folders.entries().next();
    if (!firstFolder.done) {
      const [location, files] = firstFolder.value;
      const { loadProjectFromSplitFiles, folderDisplayName } = await import("./folderProject.js");
      return {
        name: folderDisplayName(location),
        project: loadProjectFromSplitFiles(files),
        storageKind: "folder",
        projectLocation: location,
      };
    }
    const first = this.files.entries().next();
    if (first.done) return null;
    const [name, content] = first.value;
    return {
      name,
      project: parseProjectJson(content),
      storageKind: "json",
      projectLocation: name,
    };
  }

  async saveProject(project: Project, target: ProjectSaveTarget): Promise<ProjectSaveTarget> {
    if (target.storageKind === "folder") {
      const location = target.projectLocation;
      if (!location) {
        throw new Error("Folder location is required");
      }
      const { splitProject } = await import("../export/splitProject.js");
      this.folders.set(location, splitProject(assertValidProject(project)));
      return { ...target, fileName: target.fileName };
    }
    const fileName = target.fileName;
    this.files.set(fileName, serializeProject(assertValidProject(project)));
    return {
      fileName,
      storageKind: "json",
      projectLocation: fileName,
    };
  }
}
