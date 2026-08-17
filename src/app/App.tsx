import { useMemo, useState } from "react";
import { inchesToMetres } from "../catalog/brick";
import { setDisplayUnits } from "../catalog/units";
import { Sheet } from "../draw/Sheet";
import { hasDanglingEdges, leaveSketchMode } from "../geom/dangling";
import { setEdgeLength } from "../geom/edit";
import {
  createHistory,
  pushHistory,
  redo,
  replacePresent,
  undo,
} from "../geom/history";
import { wallOutlineMetrics } from "../geom/leftover";
import { analyzeThrust } from "../analysis/thrust";
import { projectJointSummary } from "../analysis/joints";
import { envelopeMetrics } from "../analysis/envelope";
import { applyButtress, buttressMetrics } from "../analysis/buttress";
import {
  footingMetrics,
  generateFootings,
  regenerateFootings,
} from "../analysis/footings";
import { multiSpanMetrics } from "../analysis/multiSpan";
import {
  applyOptimize,
  previewOptimize,
  type OptimizePreview,
} from "../analysis/optimize";
import { coreCompare as coreCompareOf, coreMetrics } from "../analysis/core";
import { generateMasonry } from "../masonry/generate";
import { scheduleReport } from "../masonry/schedule";
import { createEmptyProject } from "../model/empty";
import type {
  BondPattern,
  ButtressFaceMode,
  CoreBinder,
  DisplayUnits,
  JointMode,
  Project,
  SliceZMode,
} from "../model/project";
import { loadProject, saveProject } from "../persist/project";
import {
  centeringPolyline,
  combinedVerdict,
  dropTest,
  type DropResult,
} from "../physics/dropTest";
import { Inspector } from "../ui/Inspector";
import { APP_MODES, type AppMode } from "./modes";
import styles from "./App.module.css";

export function App() {
  const [history, setHistory] = useState(() =>
    createHistory(createEmptyProject()),
  );
  const [mode, setMode] = useState<AppMode>("edit-outline");
  const [error, setError] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [typedLength, setTypedLength] = useState("");
  const [optimize, setOptimize] = useState<OptimizePreview | null>(null);
  const [drop, setDrop] = useState<DropResult | null>(null);
  const [physicsPaused, setPhysicsPaused] = useState(true);

  const project = history.present;
  const leftover = useMemo(() => {
    if (project.faces.length === 0) return null;
    try {
      return wallOutlineMetrics(project, hasDanglingEdges(project));
    } catch {
      return null;
    }
  }, [project]);
  const masonry = useMemo(() => {
    if (project.faces.length === 0) return null;
    try {
      return generateMasonry(project);
    } catch {
      return null;
    }
  }, [project]);
  const thermal = useMemo(() => {
    if (!masonry) return null;
    try {
      return scheduleReport(project, masonry).thermal;
    } catch {
      return null;
    }
  }, [project, masonry]);
  const thrust = useMemo(() => {
    if (project.faces.length === 0) return null;
    try {
      return analyzeThrust(project);
    } catch {
      return null;
    }
  }, [project]);
  const joints = useMemo(() => {
    if (project.faces.length === 0) return null;
    try {
      return projectJointSummary(project);
    } catch {
      return null;
    }
  }, [project]);
  const envelope = useMemo(() => {
    if (project.archMembers == null || project.archMembers.length === 0) {
      return null;
    }
    try {
      return envelopeMetrics(project);
    } catch {
      return null;
    }
  }, [project]);
  const buttress = useMemo(() => {
    if (project.archMembers == null || project.archMembers.length === 0) {
      return null;
    }
    try {
      return buttressMetrics(project);
    } catch {
      return null;
    }
  }, [project]);
  const multi = useMemo(() => {
    if ((project.archMembers?.length ?? 0) < 2) return null;
    try {
      return multiSpanMetrics(project);
    } catch {
      return null;
    }
  }, [project]);
  const footings = useMemo(() => {
    if (project.faces.length === 0) return null;
    try {
      return footingMetrics(project);
    } catch {
      return null;
    }
  }, [project]);
  const centering = useMemo(
    () => (physicsPaused ? centeringPolyline(project) : []),
    [project, physicsPaused],
  );
  const core = useMemo(() => {
    if (!project.faces.some((f) => f.regionKind === "rubble")) return null;
    try {
      return coreMetrics(project);
    } catch {
      return null;
    }
  }, [project]);
  const coreAb = useMemo(() => {
    if (!core) return null;
    try {
      return coreCompareOf(project);
    } catch {
      return null;
    }
  }, [project, core]);

  const edgeId =
    selectedEdgeId && project.edges.some((e) => e.id === selectedEdgeId)
      ? selectedEdgeId
      : (project.edges[0]?.id ?? "");

  function commit(next: Project) {
    setHistory((current) => pushHistory(current, next));
  }

  function onUnits(units: DisplayUnits) {
    setHistory((current) =>
      replacePresent(current, setDisplayUnits(current.present, units)),
    );
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
        const loaded = loadProject(String(reader.result));
        setHistory(createHistory(loaded));
        setSelectedEdgeId(loaded.edges[0]?.id ?? "");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsText(file);
  }

  function onMode(next: AppMode) {
    if (mode === "edit-outline" && next !== "edit-outline") {
      const result = leaveSketchMode(project);
      setHistory((current) => replacePresent(current, result.project));
      if (!result.ok) {
        setError("DANGLING_EDGE: Sketch left with dangling edges.");
        return;
      }
      setError(null);
    }
    setMode(next);
  }

  function onApplyLength() {
    if (!edgeId) return;
    const raw = Number(typedLength);
    if (!Number.isFinite(raw) || raw <= 0) return;
    const lengthM =
      project.units === "us-customary" ? inchesToMetres(raw) : raw;
    commit(setEdgeLength(project, edgeId, lengthM));
  }

  return (
    <div className={styles.app}>
      <Inspector
        project={project}
        error={error}
        leftover={leftover}
        masonry={masonry}
        thermal={thermal}
        thrust={thrust}
        joints={joints}
        envelope={envelope}
        optimize={optimize}
        buttress={buttress}
        footings={footings}
        core={core}
        coreCompare={coreAb}
        drop={drop}
        combinedVerdict={
          drop
            ? combinedVerdict(
                thrust?.designPass ? "green" : "amber",
                drop.result,
              )
            : null
        }
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        selectedEdgeId={edgeId}
        typedLength={typedLength}
        onUnits={onUnits}
        onSave={onSave}
        onLoadFile={onLoadFile}
        onUndo={() => setHistory((current) => undo(current))}
        onRedo={() => setHistory((current) => redo(current))}
        onAllowCutCourse={(allow) =>
          commit({ ...project, allowCutCourse: allow })
        }
        onLoadFactors={(on) => commit({ ...project, loadFactorsOn: on })}
        onOptimizePreview={() => setOptimize(previewOptimize(project))}
        onOptimizeApply={() => {
          if (optimize?.refused) return;
          commit(applyOptimize(project));
          setOptimize(null);
        }}
        onOptimizeCancel={() => setOptimize(null)}
        onButtressFaceMode={(buttressFaceMode: ButtressFaceMode) =>
          commit({ ...project, buttressFaceMode })
        }
        onButtressApply={() => commit(applyButtress(project))}
        onGenerateFootings={() => commit(generateFootings(project))}
        onRegenerateFootings={(all) => commit(regenerateFootings(project, all))}
        onPhysicsPaused={setPhysicsPaused}
        onRunDropTest={() => {
          setPhysicsPaused(false);
          const stones = (masonry?.stones2D ?? []).slice(0, 40).map((s, i) => {
            const xs = s.polygon.map((p) => p.x);
            const ys = s.polygon.map((p) => p.y);
            return {
              id: s.id ?? `st${i}`,
              minX: Math.min(...xs),
              minY: Math.min(...ys),
              maxX: Math.max(...xs),
              maxY: Math.max(...ys),
            };
          });
          const span = 3.048;
          setDrop(
            dropTest({
              stones:
                stones.length > 0
                  ? stones
                  : [
                      {
                        id: "demo",
                        minX: 0,
                        minY: 0,
                        maxX: 1,
                        maxY: 0.2,
                      },
                    ],
              span,
              paused: false,
            }),
          );
        }}
        onJointMode={(jointMode: JointMode) => commit({ ...project, jointMode })}
        onCoreBinder={(binder: CoreBinder) => {
          const faces = project.faces.map((f) =>
            f.regionKind === "rubble" ? { ...f, coreBinder: binder } : f,
          );
          commit({ ...project, coreBinderDefault: binder, faces });
        }}
        onBondPattern={(bondPattern: BondPattern) =>
          commit({ ...project, bondPattern })
        }
        onSliceZMode={(sliceZMode: SliceZMode) =>
          commit({ ...project, sliceZMode })
        }
        onSelectEdge={setSelectedEdgeId}
        onTypedLength={setTypedLength}
        onApplyLength={onApplyLength}
      />
      <div className={styles.main}>
        <nav className={styles.modes} aria-label="Mode">
          {APP_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? styles.active : undefined}
              onClick={() => onMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.sheetWrap}>
          <Sheet
            project={project}
            stones={masonry?.stones2D}
            thrust={thrust}
            crushing={joints?.crushes === true}
            optimize={optimize}
            memberLines={multi?.lines}
            centering={centering}
            physicsPaused={physicsPaused}
          />
        </div>
      </div>
    </div>
  );
}
