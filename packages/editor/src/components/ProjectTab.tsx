import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore.js";
import { createBrowserFileSystem } from "../lib/project/fileSystem.js";
import { loadSampleTemplate } from "../lib/project/loadTemplate.js";
import { saveProjectAtomic } from "../lib/project/saveProject.js";
import { MemoryWriteTarget } from "../lib/project/atomicWrite.js";
import { BACKUP_PREFIX, loadBackupList } from "../lib/project/backup.js";
import { createLocalStorageBackupStore } from "../lib/project/storageAdapter.js";

const browserFs = createBrowserFileSystem();

export function ProjectTab() {
  const project = useProjectStore((s) => s.project);
  const dirty = useProjectStore((s) => s.dirty);
  const fileName = useProjectStore((s) => s.fileName);
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const initNewProject = useProjectStore((s) => s.initNewProject);
  const openProjectData = useProjectStore((s) => s.openProjectData);
  const markClean = useProjectStore((s) => s.markClean);
  const setError = useProjectStore((s) => s.setError);
  const [backupCount, setBackupCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const refreshBackups = useCallback(() => {
    if (!project) return;
    const key = fileName ?? project.name;
    const list = loadBackupList(createLocalStorageBackupStore(localStorage), key);
    setBackupCount(list.length);
  }, [project, fileName]);

  useEffect(() => {
    refreshBackups();
  }, [refreshBackups]);

  const handleNewSample = async () => {
    await initNewProject();
  };

  const handleOpen = async () => {
    const opened = await browserFs.openProject();
    if (opened) {
      openProjectData(opened.name, opened.project);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    setError(null);
    try {
      const key = fileName ?? `${project.name}.json`;
      if ("showSaveFilePicker" in window) {
        await browserFs.saveProject(project, key);
      } else {
        const target = new MemoryWriteTarget();
        await saveProjectAtomic({
          project,
          target,
          backupStore: createLocalStorageBackupStore(localStorage),
          projectKey: key,
        });
        setLastSaved(target.content.slice(0, 80));
      }
      markClean();
      refreshBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLoadTemplateOnly = async () => {
    try {
      const tpl = await loadSampleTemplate({ projectName: "テンプレート再読込" });
      openProjectData("template.json", tpl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="panel" data-testid="project-tab">
      <h2>プロジェクト</h2>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="toolbar">
        <button type="button" onClick={() => void handleNewSample()} data-testid="btn-new-project">
          新規（サンプル）
        </button>
        <button type="button" onClick={() => void handleOpen()} data-testid="btn-open-project">
          開く
        </button>
        <button type="button" onClick={() => void handleSave()} disabled={!project} data-testid="btn-save-project">
          保存
        </button>
        <button type="button" onClick={() => void handleLoadTemplateOnly()} data-testid="btn-reload-template">
          テンプレート再読込
        </button>
      </div>
      {loading ? <p>読み込み中…</p> : null}
      {project ? (
        <dl className="meta" data-testid="project-meta">
          <dt>名前</dt>
          <dd data-testid="project-name">{project.name}</dd>
          <dt>ファイル</dt>
          <dd>{fileName ?? "—"}</dd>
          <dt>状態</dt>
          <dd data-testid="project-dirty">{dirty ? "未保存" : "保存済み"}</dd>
          <dt>マップ数</dt>
          <dd>{Object.keys(project.maps).length}</dd>
          <dt>バックアップ</dt>
          <dd data-testid="backup-count">{backupCount} / 5</dd>
        </dl>
      ) : (
        <p>プロジェクトがありません。「新規（サンプル）」で開始してください。</p>
      )}
      {lastSaved ? (
        <p className="hint">ブラウザ保存モード: {lastSaved}…</p>
      ) : null}
      <p className="hint">バックアップキー: {BACKUP_PREFIX}*</p>
    </section>
  );
}
