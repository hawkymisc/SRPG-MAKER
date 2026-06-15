import { getElectronBridge } from "./electronBridge.js";
import { createElectronFileSystem } from "./electronFileSystem.js";
import { createBrowserFileSystem, type ProjectFileSystem } from "./fileSystem.js";

export function createProjectFileSystem(): ProjectFileSystem {
  const bridge = getElectronBridge();
  if (bridge) {
    return createElectronFileSystem(bridge);
  }
  return createBrowserFileSystem();
}

export type {
  OpenedProject,
  ProjectFileSystem,
  ProjectSaveTarget,
  ProjectStorageKind,
} from "./fileSystem.js";
