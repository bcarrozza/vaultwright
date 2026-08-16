import { useState } from "react";
import { setDisplayUnits } from "../catalog/units";
import { Sheet } from "../draw/Sheet";
import { createEmptyProject } from "../model/empty";
import type { DisplayUnits, Project } from "../model/project";
import { loadProject, saveProject } from "../persist/project";
import { Inspector } from "../ui/Inspector";
import { APP_MODES, type AppMode } from "./modes";
import styles from "./App.module.css";

export function App() {
  const [project, setProject] = useState<Project>(() => createEmptyProject());
  const [mode, setMode] = useState<AppMode>("edit-outline");
  const [error, setError] = useState<string | null>(null);

  function onUnits(units: DisplayUnits) {
    setProject((current) => setDisplayUnits(current, units));
  }

  function onSave() {
    const json = saveProject(project);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "project.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function onLoadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setProject(loadProject(String(reader.result)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className={styles.app}>
      <Inspector
        project={project}
        error={error}
        onUnits={onUnits}
        onSave={onSave}
        onLoadFile={onLoadFile}
      />
      <div className={styles.main}>
        <nav className={styles.modes} aria-label="Mode">
          {APP_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? styles.active : undefined}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.sheetWrap}>
          <Sheet project={project} />
        </div>
      </div>
    </div>
  );
}
