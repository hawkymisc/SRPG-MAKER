import type { Project } from "@srpg/shared";
import type { ProjectAssetFiles } from "./projectAssets.js";
import type { ProjectSaveTarget, ProjectStorageKind } from "./fileSystem.js";

export type StorageBackendKind = "local" | "cloud";

export interface ProjectBundle {
  project: Project;
  assets: ProjectAssetFiles;
}

export interface StoredProjectRef {
  name: string;
  storageKind: ProjectStorageKind;
  projectLocation: string | null;
  remoteId?: string;
}

export interface OpenedProjectBundle extends StoredProjectRef {
  project: Project;
  assets: ProjectAssetFiles;
}

export interface ProjectStorageAdapter {
  readonly kind: StorageBackendKind;
  readonly label: string;
  readonly available: boolean;
  readonly unavailableReason?: string;
  readonly supportsNativeFolder: boolean;
  openProject(): Promise<OpenedProjectBundle | null>;
  saveProject(bundle: ProjectBundle, target: ProjectSaveTarget): Promise<StoredProjectRef>;
}

export const STORAGE_BACKEND_PREF_KEY = "srpg-editor-storage-backend";

export function parseStorageBackendKind(value: string | null): StorageBackendKind {
  return value === "cloud" ? "cloud" : "local";
}

export function loadStorageBackendPreference(
  storage: Pick<Storage, "getItem"> = localStorage,
): StorageBackendKind {
  return parseStorageBackendKind(storage.getItem(STORAGE_BACKEND_PREF_KEY));
}

export function saveStorageBackendPreference(
  kind: StorageBackendKind,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(STORAGE_BACKEND_PREF_KEY, kind);
}
