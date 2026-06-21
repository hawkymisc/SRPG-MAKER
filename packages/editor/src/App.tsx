import { useEffect } from "react";
import { useProjectStore } from "./store/projectStore.js";
import { useTheme } from "./hooks/useTheme.js";
import { ProjectTab } from "./components/ProjectTab.js";
import { DatabaseTab } from "./components/DatabaseTab.js";
import { MapTab } from "./components/MapTab.js";
import { TestPlayTab } from "./components/TestPlayTab.js";
import { EventEditorTab } from "./components/EventEditorTab.js";
import { AssetsTab } from "./components/AssetsTab.js";

const TABS = [
  { id: "project" as const, label: "プロジェクト" },
  { id: "database" as const, label: "データベース" },
  { id: "map" as const, label: "マップ" },
  { id: "testplay" as const, label: "テストプレイ" },
  { id: "events" as const, label: "イベント" },
  { id: "assets" as const, label: "素材" },
];

export function App() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const project = useProjectStore((s) => s.project);
  const initNewProject = useProjectStore((s) => s.initNewProject);
  const dirty = useProjectStore((s) => s.dirty);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!project) {
      void initNewProject();
    }
  }, [project, initNewProject]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "1") setActiveTab("project");
      if (e.ctrlKey && e.key === "2") setActiveTab("database");
      if (e.ctrlKey && e.key === "3") setActiveTab("map");
      if (e.ctrlKey && e.key === "4") setActiveTab("testplay");
      if (e.ctrlKey && e.key === "5") setActiveTab("events");
      if (e.ctrlKey && e.key === "6") setActiveTab("assets");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveTab]);

  return (
    <div className="app" data-testid="editor-app">
      <header className="app-header">
        <h1>SRPGツクール</h1>
        {project ? (
          <span className="project-title" data-testid="header-project-name">
            {project.name}
            {dirty ? " *" : ""}
          </span>
        ) : null}
        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
            data-testid="theme-toggle"
          >
            {theme === "dark" ? "\u2600" : "\u263D"}
          </button>
        </div>
      </header>
      <nav className="main-tabs" aria-label="メインタブ">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="app-main">
        {activeTab === "project" ? <ProjectTab /> : null}
        {activeTab === "database" ? <DatabaseTab /> : null}
        {activeTab === "map" ? <MapTab /> : null}
        {activeTab === "testplay" ? <TestPlayTab /> : null}
        {activeTab === "events" ? <EventEditorTab /> : null}
        {activeTab === "assets" ? <AssetsTab /> : null}
      </main>
    </div>
  );
}
