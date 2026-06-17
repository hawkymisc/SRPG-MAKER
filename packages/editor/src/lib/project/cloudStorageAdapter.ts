import type {
  OpenedProjectBundle,
  ProjectBundle,
  ProjectStorageAdapter,
  StoredProjectRef,
} from "./projectStorageAdapter.js";
import type { ProjectSaveTarget } from "./fileSystem.js";

const CLOUD_UNAVAILABLE =
  "クラウド保存は未実装です。実体（GitHub / S3 等）の選定後に接続します（ADR 0009）。";

/** Placeholder adapter until a cloud provider is chosen. */
export class CloudProjectStorageAdapter implements ProjectStorageAdapter {
  readonly kind = "cloud" as const;
  readonly label = "クラウド";
  readonly available = false;
  readonly unavailableReason = CLOUD_UNAVAILABLE;
  readonly supportsNativeFolder = false;

  async openProject(): Promise<OpenedProjectBundle | null> {
    throw new Error(CLOUD_UNAVAILABLE);
  }

  async saveProject(bundle: ProjectBundle, target: ProjectSaveTarget): Promise<StoredProjectRef> {
    void bundle;
    void target;
    throw new Error(CLOUD_UNAVAILABLE);
  }
}

export { CLOUD_UNAVAILABLE };
