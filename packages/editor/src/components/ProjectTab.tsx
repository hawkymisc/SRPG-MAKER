import { useCallback, useEffect, useMemo, useState } from "react";
import { ChapterSchema, mapFileStem } from "@srpg/shared";
import { useProjectStore } from "../store/projectStore.js";
import { createProjectFileSystem } from "../lib/project/createFileSystem.js";
import { getElectronBridge } from "../lib/project/electronBridge.js";
import { loadSampleTemplate } from "../lib/project/loadTemplate.js";
import { saveProjectAtomic } from "../lib/project/saveProject.js";
import { MemoryWriteTarget } from "../lib/project/atomicWrite.js";
import { BACKUP_PREFIX, loadBackupList } from "../lib/project/backup.js";
import { createLocalStorageBackupStore } from "../lib/project/storageAdapter.js";
import {
  downloadExportBlob,
  exportHtml5,
  fetchRuntimeDist,
} from "../lib/export/exportHtml5.js";
import { exportElectron } from "../lib/export/exportElectron.js";

export function ProjectTab() {
  const projectFs = useMemo(() => createProjectFileSystem(), []);
  const isDesktopEditor = useMemo(() => getElectronBridge() !== undefined, []);
  const project = useProjectStore((s) => s.project);
  const dirty = useProjectStore((s) => s.dirty);
  const fileName = useProjectStore((s) => s.fileName);
  const storageKind = useProjectStore((s) => s.storageKind);
  const projectLocation = useProjectStore((s) => s.projectLocation);
  const applySaveTarget = useProjectStore((s) => s.applySaveTarget);
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const initNewProject = useProjectStore((s) => s.initNewProject);
  const openProjectData = useProjectStore((s) => s.openProjectData);
  const markClean = useProjectStore((s) => s.markClean);
  const setError = useProjectStore((s) => s.setError);
  const runtimeDistUrl = useProjectStore((s) => s.runtimeDistUrl);
  const setStartChapterId = useProjectStore((s) => s.setStartChapterId);
  const addChapter = useProjectStore((s) => s.addChapter);
  const removeChapter = useProjectStore((s) => s.removeChapter);
  const selectChapter = useProjectStore((s) => s.selectChapter);
  const updateChapter = useProjectStore((s) => s.updateChapter);
  const togglePluginEnabled = useProjectStore((s) => s.togglePluginEnabled);
  const selectedChapterId = useProjectStore((s) => s.selectedChapterId);
  const [backupCount, setBackupCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
    const opened = await projectFs.openProject();
    if (opened) {
      openProjectData(opened.name, opened.project, {
        storageKind: opened.storageKind,
        projectLocation: opened.projectLocation,
      });
    }
  };

  const handleSave = async () => {
    if (!project) return;
    setError(null);
    try {
      const key = fileName ?? `${project.name}.json`;
      if (projectFs.nativeFolder || "showSaveFilePicker" in window) {
        const next = await projectFs.saveProject(project, {
          fileName: key,
          storageKind,
          projectLocation,
        });
        applySaveTarget(next);
      } else {
        const target = new MemoryWriteTarget();
        await saveProjectAtomic({
          project,
          target,
          backupStore: createLocalStorageBackupStore(localStorage),
          projectKey: key,
        });
        setLastSaved(target.content.slice(0, 80));
        markClean();
      }
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

  const handleExportHtml5 = async () => {
    if (!project) return;
    setExporting(true);
    setError(null);
    try {
      const runtimeFiles = await fetchRuntimeDist({ baseUrl: runtimeDistUrl });
      const result = exportHtml5({ project, runtimeFiles });
      downloadExportBlob(result.blob, result.fileName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("index.html") || message.includes("Failed to fetch")
          ? `ランタイムの取得に失敗しました。先に \`pnpm dev:runtime\` を起動するか、packages/runtime をビルドしてください。(${message})`
          : message,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportElectron = async () => {
    if (!project) return;
    setExporting(true);
    setError(null);
    try {
      const runtimeFiles = await fetchRuntimeDist({ baseUrl: runtimeDistUrl });
      const result = exportElectron({ project, runtimeFiles });
      downloadExportBlob(result.blob, result.fileName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("index.html") || message.includes("Failed to fetch")
          ? `ランタイムの取得に失敗しました。先に \`pnpm dev:runtime\` を起動するか、packages/runtime をビルドしてください。(${message})`
          : message,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="panel" data-testid="project-tab">
      <h2>プロジェクト</h2>
      {isDesktopEditor ? (
        <p className="hint" data-testid="desktop-editor-badge">
          デスクトップ版 — フォルダ形式のネイティブ保存に対応
        </p>
      ) : null}
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
        <button
          type="button"
          onClick={() => void handleExportHtml5()}
          disabled={!project || exporting}
          data-testid="btn-export-html5"
        >
          {exporting ? "書き出し中…" : "HTML5書き出し"}
        </button>
        <button
          type="button"
          onClick={() => void handleExportElectron()}
          disabled={!project || exporting}
          data-testid="btn-export-electron"
        >
          {exporting ? "書き出し中…" : "Electron書き出し"}
        </button>
      </div>
      {loading ? <p>読み込み中…</p> : null}
      {project ? (
        <dl className="meta" data-testid="project-meta">
          <dt>名前</dt>
          <dd data-testid="project-name">{project.name}</dd>
          <dt>ファイル</dt>
          <dd>{fileName ?? "—"}</dd>
          {projectLocation ? (
            <>
              <dt>保存先</dt>
              <dd data-testid="project-location">{projectLocation}</dd>
            </>
          ) : null}
          <dt>形式</dt>
          <dd data-testid="project-storage-kind">{storageKind === "folder" ? "フォルダ" : "JSON"}</dd>
          <dt>状態</dt>
          <dd data-testid="project-dirty">{dirty ? "未保存" : "保存済み"}</dd>
          <dt>マップ数</dt>
          <dd>{Object.keys(project.maps).length}</dd>
          <dt>章数</dt>
          <dd data-testid="project-chapter-count">{Object.keys(project.chapters ?? {}).length}</dd>
          <dt>バックアップ</dt>
          <dd data-testid="backup-count">{backupCount} / 5</dd>
        </dl>
      ) : (
        <p>プロジェクトがありません。「新規（サンプル）」で開始してください。</p>
      )}
      {project ? (
        <section className="chapter-panel" data-testid="chapter-panel">
          <h3>章（シナリオ）</h3>
          <button
            type="button"
            data-testid="btn-add-chapter"
            onClick={() => {
              const mapIds = Object.keys(project.maps);
              const mapId = mapIds[0];
              if (!mapId) return;
              const map = project.maps[mapId]!;
              const chapterId = mapFileStem(mapId);
              addChapter(
                ChapterSchema.parse({
                  id: chapterId,
                  name: map.name,
                  mapId,
                  sortOrder: Object.keys(project.chapters ?? {}).length,
                }),
              );
            }}
            disabled={Object.keys(project.maps).length === 0}
          >
            章を追加
          </button>
          <ul className="chapter-list" data-testid="chapter-list">
            {Object.values(project.chapters ?? {})
              .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
              .map((chapter) => (
                <li
                  key={chapter.id}
                  className={selectedChapterId === chapter.id ? "active" : ""}
                  data-testid={`chapter-row-${chapter.id}`}
                >
                  <label>
                    <input
                      type="radio"
                      name="start-chapter"
                      checked={project.startChapterId === chapter.id}
                      onChange={() => setStartChapterId(chapter.id)}
                      data-testid={`chapter-start-${chapter.id}`}
                    />
                    開始章
                  </label>
                  <button type="button" onClick={() => selectChapter(chapter.id)}>
                    {chapter.name}
                  </button>
                  <select
                    value={chapter.mapId}
                    onChange={(e) =>
                      updateChapter(chapter.id, {
                        ...chapter,
                        mapId: e.target.value as typeof chapter.mapId,
                      })
                    }
                    data-testid={`chapter-map-${chapter.id}`}
                  >
                    {Object.values(project.maps).map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.name} ({map.id})
                      </option>
                    ))}
                  </select>
                  <input
                    value={chapter.name}
                    onChange={(e) =>
                      updateChapter(chapter.id, { ...chapter, name: e.target.value })
                    }
                    data-testid={`chapter-name-${chapter.id}`}
                  />
                  <input
                    type="number"
                    min={0}
                    value={chapter.sortOrder}
                    onChange={(e) =>
                      updateChapter(chapter.id, {
                        ...chapter,
                        sortOrder: Number(e.target.value),
                      })
                    }
                    data-testid={`chapter-order-${chapter.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeChapter(chapter.id)}
                    data-testid={`chapter-remove-${chapter.id}`}
                  >
                    削除
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
      {project && Object.keys(project.plugins ?? {}).length > 0 ? (
        <section className="plugin-panel" data-testid="plugin-panel">
          <h3>プラグイン</h3>
          <ul className="plugin-list">
            {Object.values(project.plugins ?? {}).map((plugin) => {
              const enabled = (project.enabledPlugins ?? []).includes(plugin.id);
              return (
                <li key={plugin.id} data-testid={`plugin-row-${plugin.id}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => togglePluginEnabled(plugin.id, e.target.checked)}
                      data-testid={`plugin-enabled-${plugin.id}`}
                    />
                    {plugin.name} (v{plugin.version}) — {plugin.rules.length} rules
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {project && Object.keys(project.supports ?? {}).length > 0 ? (
        <section className="plugin-panel" data-testid="support-panel">
          <h3>支援会話</h3>
          <ul className="plugin-list">
            {Object.values(project.supports ?? {}).map((support) => (
              <li key={support.id} data-testid={`support-row-${support.id}`}>
                [{support.rank}] {support.unitA} × {support.unitB} — {support.name} (必要Pt:{" "}
                {support.requiredPoints})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {lastSaved ? (
        <p className="hint">ブラウザ保存モード: {lastSaved}…</p>
      ) : null}
      <p className="hint">バックアップキー: {BACKUP_PREFIX}*</p>
    </section>
  );
}
