import type { ChangeEvent } from "react";
import type { DisplayUnits, JointMode, Project } from "../model/project";
import styles from "./Inspector.module.css";

type Props = {
  project: Project;
  error: string | null;
  onUnits: (units: DisplayUnits) => void;
  onSave: () => void;
  onLoadFile: (file: File) => void;
};

export function Inspector({
  project,
  error,
  onUnits,
  onSave,
  onLoadFile,
}: Props) {
  const joint: JointMode = project.jointMode ?? "lime";

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onLoadFile(file);
    event.target.value = "";
  }

  return (
    <aside className={styles.panel}>
      <h1 className={styles.title}>Arch Optimizer</h1>
      <fieldset className={styles.fieldset}>
        <legend>Units</legend>
        <label>
          <input
            type="radio"
            name="units"
            checked={project.units === "us-customary"}
            onChange={() => onUnits("us-customary")}
          />
          US customary
        </label>
        <label>
          <input
            type="radio"
            name="units"
            checked={project.units === "metric"}
            onChange={() => onUnits("metric")}
          />
          Metric
        </label>
      </fieldset>
      <p className={styles.note}>
        Display only. Stored numbers stay SI.
      </p>
      <fieldset className={styles.fieldset}>
        <legend>Joint mode</legend>
        <span>{joint === "lime" ? "Lime" : "Dry"}</span>
      </fieldset>
      <div className={styles.row}>
        <button type="button" onClick={onSave}>
          Save JSON
        </button>
        <label className={styles.file}>
          Load JSON
          <input type="file" accept="application/json,.json" onChange={handleFile} />
        </label>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </aside>
  );
}
