import type { BackupStore } from "./backup.js";

export function createLocalStorageBackupStore(storage: Storage): BackupStore {
  return {
    get(key: string) {
      return storage.getItem(key);
    },
    set(key: string, value: string) {
      storage.setItem(key, value);
    },
  };
}
