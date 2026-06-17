import { CloudProjectStorageAdapter } from "./cloudStorageAdapter.js";
import { createBrowserFileSystem } from "./fileSystem.js";
import { createElectronFileSystem } from "./electronFileSystem.js";
import { getElectronBridge } from "./electronBridge.js";
import { LocalProjectStorageAdapter } from "./localProjectStorageAdapter.js";
import type { ProjectStorageAdapter, StorageBackendKind } from "./projectStorageAdapter.js";

export function createProjectFileSystem() {
  const bridge = getElectronBridge();
  if (bridge) {
    return createElectronFileSystem(bridge);
  }
  return createBrowserFileSystem();
}

export function createProjectStorageAdapter(kind: StorageBackendKind): ProjectStorageAdapter {
  if (kind === "cloud") {
    return new CloudProjectStorageAdapter();
  }
  return new LocalProjectStorageAdapter(createProjectFileSystem());
}

export type {
  OpenedProject,
  ProjectFileSystem,
  ProjectSaveTarget,
  ProjectStorageKind,
} from "./fileSystem.js";

export type {
  OpenedProjectBundle,
  ProjectBundle,
  ProjectStorageAdapter,
  StorageBackendKind,
  StoredProjectRef,
} from "./projectStorageAdapter.js";
