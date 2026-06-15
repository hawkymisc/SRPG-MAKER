import { splitProject } from "../export/splitProject.js";
import type { SrpgElectronBridge } from "./electronBridge.js";
import { folderDisplayName, loadProjectFromSplitFiles } from "./folderProject.js";
import type { ProjectFileSystem } from "./fileSystem.js";
import { assertValidProject } from "./validate.js";
import { parseProjectJson, serializeProject } from "./serialize.js";
import type { OpenedProject } from "./fileSystem.js";

function jsonFileNameFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? filePath;
}

export function createElectronFileSystem(bridge: SrpgElectronBridge): ProjectFileSystem {
  return {
    nativeFolder: true,

    async openProject(): Promise<OpenedProject | null> {
      const folderPath = await bridge.pickOpenFolder();
      if (folderPath) {
        const files = await bridge.readFolderFiles(folderPath);
        return {
          name: folderDisplayName(folderPath),
          project: loadProjectFromSplitFiles(files),
          storageKind: "folder",
          projectLocation: folderPath,
        };
      }

      const filePath = await bridge.pickOpenFile();
      if (!filePath) {
        return null;
      }
      const text = await bridge.readTextFile(filePath);
      return {
        name: jsonFileNameFromPath(filePath),
        project: parseProjectJson(text),
        storageKind: "json",
        projectLocation: filePath,
      };
    },

    async saveProject(project, target) {
      const validated = assertValidProject(project);
      const useFolder = target.storageKind === "folder" || target.projectLocation === null;

      if (useFolder) {
        let folderPath = target.storageKind === "folder" ? target.projectLocation : null;
        if (!folderPath) {
          folderPath = await bridge.pickSaveFolder();
          if (!folderPath) {
            throw new Error("保存先フォルダが選択されませんでした");
          }
        }
        await bridge.writeFolderFiles(folderPath, splitProject(validated));
        return {
          fileName: folderDisplayName(folderPath),
          storageKind: "folder",
          projectLocation: folderPath,
        };
      }

      let filePath = target.projectLocation;
      if (!filePath) {
        filePath = await bridge.pickSaveFile(target.fileName);
        if (!filePath) {
          throw new Error("保存先ファイルが選択されませんでした");
        }
      }
      await bridge.writeTextFile(filePath, serializeProject(validated));
      return {
        fileName: jsonFileNameFromPath(filePath),
        storageKind: "json",
        projectLocation: filePath,
      };
    },
  };
}
