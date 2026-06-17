import type { ProjectFileSystem, ProjectSaveTarget } from "./fileSystem.js";
import type {
  OpenedProjectBundle,
  ProjectBundle,
  ProjectStorageAdapter,
  StoredProjectRef,
} from "./projectStorageAdapter.js";

export class LocalProjectStorageAdapter implements ProjectStorageAdapter {
  readonly kind = "local" as const;
  readonly label = "ローカル";
  readonly available = true;
  readonly supportsNativeFolder: boolean;

  constructor(private readonly fileSystem: ProjectFileSystem) {
    this.supportsNativeFolder = fileSystem.nativeFolder;
  }

  async openProject(): Promise<OpenedProjectBundle | null> {
    const opened = await this.fileSystem.openProject();
    if (!opened) {
      return null;
    }
    return {
      name: opened.name,
      project: opened.project,
      assets: opened.assets,
      storageKind: opened.storageKind,
      projectLocation: opened.projectLocation,
    };
  }

  async saveProject(bundle: ProjectBundle, target: ProjectSaveTarget): Promise<StoredProjectRef> {
    const next = await this.fileSystem.saveProject(bundle.project, target, bundle.assets);
    return {
      name: next.fileName,
      storageKind: next.storageKind,
      projectLocation: next.projectLocation,
    };
  }
}
