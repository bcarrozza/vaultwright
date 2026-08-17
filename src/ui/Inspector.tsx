import type { ChangeEvent } from "react";
import type {
  BondPattern,
  ButtressFaceMode,
  CoreBinder,
  DisplayUnits,
  JointMode,
  Project,
  SliceZMode,
} from "../model/project";
import type { ThrustAnalysis } from "../analysis/types";
import { thrustWarnings } from "../analysis/thrust";
import type { ProjectJointSummary } from "../analysis/joints";
import type { EnvelopeMetrics } from "../analysis/envelope";
import type { OptimizePreview } from "../analysis/optimize";
import type { ButtressMetrics } from "../analysis/buttress";
import type { FootingMetrics } from "../analysis/footings";
import type { CoreMetrics } from "../analysis/core";
import type { DropResult } from "../physics/dropTest";
import type { WallOutlineMetrics } from "../geom/leftover";
import { SCOPE_2D } from "../masonry/warnings";
import type { FaceMass } from "../masonry/schedule";
import type { MasonryResult } from "../masonry/types";
import styles from "./Inspector.module.css";

type Props = {
  project: Project;
  error: string | null;
  leftover: WallOutlineMetrics | null;
  masonry?: MasonryResult | null;
  thrust?: ThrustAnalysis | null;
  joints?: ProjectJointSummary | null;
  envelope?: EnvelopeMetrics | null;
  optimize?: OptimizePreview | null;
  buttress?: ButtressMetrics | null;
  footings?: FootingMetrics | null;
  core?: CoreMetrics | null;
  coreCompare?: { dry: CoreMetrics; limeBound: CoreMetrics } | null;
  thermal?: FaceMass[] | null;
  drop?: DropResult | null;
  combinedVerdict?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedEdgeId: string;
  typedLength: string;
  onUnits: (units: DisplayUnits) => void;
  onSave: () => void;
  onLoadFile: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAllowCutCourse: (allow: boolean) => void;
  onLoadFactors?: (on: boolean) => void;
  onOptimizePreview?: () => void;
  onOptimizeApply?: () => void;
  onOptimizeCancel?: () => void;
  onButtressFaceMode?: (mode: ButtressFaceMode) => void;
  onButtressApply?: () => void;
  onGenerateFootings?: () => void;
  onRegenerateFootings?: (all: boolean) => void;
  onPhysicsPaused?: (paused: boolean) => void;
  onRunDropTest?: () => void;
  onJointMode?: (mode: JointMode) => void;
  onCoreBinder?: (binder: CoreBinder) => void;
  onBondPattern?: (pattern: BondPattern) => void;
  onSliceZMode?: (mode: SliceZMode) => void;
  onSelectEdge: (id: string) => void;
  onTypedLength: (value: string) => void;
  onApplyLength: () => void;
};

export function Inspector({
  project,
  error,
  leftover,
  masonry,
  thrust = null,
  joints = null,
  envelope = null,
  optimize = null,
  buttress = null,
  footings = null,
  core = null,
  coreCompare = null,
  thermal = null,
  drop = null,
  combinedVerdict = null,
  canUndo,
  canRedo,
  selectedEdgeId,
  typedLength,
  onUnits,
  onSave,
  onLoadFile,
  onUndo,
  onRedo,
  onAllowCutCourse,
  onLoadFactors,
  onOptimizePreview,
  onOptimizeApply,
  onOptimizeCancel,
  onButtressFaceMode,
  onButtressApply,
  onGenerateFootings,
  onRegenerateFootings,
  onPhysicsPaused,
  onRunDropTest,
  onJointMode,
  onCoreBinder,
  onBondPattern,
  onSliceZMode,
  onSelectEdge,
  onTypedLength,
  onApplyLength,
}: Props) {
  const joint: JointMode = project.jointMode ?? "lime";
  const us = project.units === "us-customary";
  const warnings = [
    ...(project.warnings ?? []),
    ...(masonry?.warnings ?? []),
    ...(thrust ? thrustWarnings(thrust) : []),
    ...(joints?.warnings ?? []),
    ...(buttress?.warnings ?? []),
    ...(footings?.warnings ?? []),
    ...(drop?.warnings ?? []),
    {
      code: SCOPE_2D,
      severity: "info" as const,
      message:
        "Educational visualizer. Gravity + live load in the slice plane only — not a complete building design.",
    },
  ];
  const bondPattern: BondPattern = project.bondPattern ?? "common";
  const sliceZMode: SliceZMode = project.sliceZMode ?? "header-course";

  function roundShown(n: number): string {
    return String(Math.round(n * 1000) / 1000);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onLoadFile(file);
    event.target.value = "";
  }

  return (
    <aside className={styles.panel}>
      <h1 className={styles.title}>Arch Optimizer</h1>
      <p className={styles.note} data-disclaimer="SCOPE_2D">
        Educational visualizer; not a substitute for a licensed engineer.
        v1 analyzes gravity + live load in the slice plane only (SCOPE_2D).
        Wind, earthquakes, and out-of-plane slenderness are not checked.
      </p>
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
        <label>
          <input
            type="radio"
            name="jointMode"
            checked={joint === "lime"}
            onChange={() => onJointMode?.("lime")}
          />
          Lime
        </label>
        <label>
          <input
            type="radio"
            name="jointMode"
            checked={joint === "dry"}
            onChange={() => onJointMode?.("dry")}
          />
          Dry
        </label>
        <p className={styles.note}>
          Independent of core binder. No tension.
        </p>
      </fieldset>
      {core?.coreDrawn ? (
        <fieldset className={styles.fieldset} data-core="true">
          <legend>Core binder</legend>
          <label>
            <input
              type="radio"
              name="coreBinder"
              checked={core.binder === "dry"}
              onChange={() => onCoreBinder?.("dry")}
            />
            Dry (default)
          </label>
          <label>
            <input
              type="radio"
              name="coreBinder"
              checked={core.binder === "lime-bound"}
              onChange={() => onCoreBinder?.("lime-bound")}
            />
            Lime-bound
          </label>
          <p className={styles.metric}>
            Kern {roundShown(core.kernWidth_m)} m
            {core.kernIsFullWall ? " (full wall)" : " (skins only)"}
          </p>
          {coreCompare ? (
            <>
              <p className={styles.metric}>
                A/B dry kern {roundShown(coreCompare.dry.kernWidth_m)} m, lime{" "}
                {roundShown(coreCompare.limeBound.kernWidth_m)} m
              </p>
              <p className={styles.metric}>
                Lime volume {roundShown(coreCompare.limeBound.limeVolume_m3)} m³,
                cost {roundShown(coreCompare.limeBound.costProxy)}
              </p>
            </>
          ) : null}
        </fieldset>
      ) : null}
      <fieldset className={styles.fieldset} data-bond="true">
        <legend>Bond</legend>
        <label>
          Pattern
          <select
            value={bondPattern}
            onChange={(event) =>
              onBondPattern?.(event.target.value as BondPattern)
            }
            disabled={!onBondPattern}
          >
            <option value="common">Common / American</option>
            <option value="english">English</option>
            <option value="flemish">Flemish</option>
            <option value="ashlar-through">Coursed ashlar (through)</option>
          </select>
        </label>
        <label>
          Slice Z
          <select
            value={sliceZMode}
            onChange={(event) =>
              onSliceZMode?.(event.target.value as SliceZMode)
            }
            disabled={!onSliceZMode}
          >
            <option value="header-course">Header course (tied)</option>
            <option value="stretcher-course">Stretcher course</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </fieldset>
      {masonry ? (
        <fieldset className={styles.fieldset} data-schedule="true">
          <legend>Stone schedule</legend>
          <p className={styles.metric}>
            3D over sliceDepth: {masonry.schedule.headers3D} headers,{" "}
            {masonry.schedule.stretchers3D} stretchers,{" "}
            {masonry.schedule.voussoirs3D} voussoirs ({masonry.schedule.total3D}{" "}
            units)
          </p>
          <p className={styles.metric}>
            In slice: {masonry.schedule.headersInSlice} headers,{" "}
            {masonry.schedule.stretchersInSlice} stretchers (
            {masonry.schedule.totalInSlice} polygons)
          </p>
        </fieldset>
      ) : null}
      {thermal && thermal.length > 0 ? (
        <fieldset className={styles.fieldset} data-thermal="true">
          <legend>Thermal mass</legend>
          {thermal.map((row) => (
            <p key={row.faceId} className={styles.metric}>
              {row.regionKind}: t {roundShown(row.thickness_m)} m, area{" "}
              {roundShown(row.area_m2)} m², mass {Math.round(row.mass_kg)} kg
            </p>
          ))}
          <p className={styles.note}>No climate engine.</p>
        </fieldset>
      ) : null}
      {thrust ? (
        <fieldset className={styles.fieldset} data-thrust="true">
          <legend>Thrust</legend>
          <p className={styles.metric}>
            H {thrust.threeHinged.H_N} N (three-hinged)
          </p>
          <p className={styles.metric}>
            Design H {roundShown(thrust.designH_N)} N (kern-search)
          </p>
          <p className={styles.metric}>
            max |e| {roundShown(thrust.maxAbsE_m)} m vs t/6{" "}
            {roundShown(thrust.t_m / 6)} m
          </p>
          <p className={styles.metric}>
            Max stress placeholder (crushing S05)
          </p>
          <p className={styles.metric} data-design-pass={String(thrust.designPass)}>
            Design status: {thrust.designPass ? "pass" : "not a pass"}
          </p>
          <p className={styles.note}>
            Green = middle third. Amber = in masonry, not a pass. Red = outside.
          </p>
        </fieldset>
      ) : null}
      {optimize ? (
        <fieldset className={styles.fieldset} data-optimize="true">
          <legend>Optimize</legend>
          <p className={styles.metric}>t {optimize.t} m (was {optimize.tInitial} m)</p>
          <p className={styles.metric}>
            r0 {optimize.r0} → r_opt {optimize.rOpt}
          </p>
          <div className={styles.row}>
            <button type="button" onClick={() => onOptimizePreview?.()}>
              Preview
            </button>
            <button type="button" onClick={() => onOptimizeApply?.()}>
              Apply
            </button>
            <button type="button" onClick={() => onOptimizeCancel?.()}>
              Cancel
            </button>
          </div>
        </fieldset>
      ) : (
        <fieldset className={styles.fieldset} data-optimize="true">
          <legend>Optimize</legend>
          <button type="button" onClick={() => onOptimizePreview?.()}>
            Preview
          </button>
        </fieldset>
      )}
      {buttress ? (
        <fieldset className={styles.fieldset} data-buttress="true">
          <legend>Buttress</legend>
          <p className={styles.metric}>
            Ground angle {buttress.groundAngleFromVertical_deg}° from vertical
          </p>
          <p className={styles.metric}>
            Ground width {roundShown(buttress.userGroundWidth_m)} m (min green{" "}
            {roundShown(buttress.minGreenGroundWidth_m)} m)
          </p>
          <p className={styles.metric} data-excess={String(buttress.excess)}>
            {buttress.excess
              ? "Buttress thicker than needed"
              : "Ground width within 120% of minimum"}
          </p>
          <p className={styles.note}>
            Taper max 1:3. Tiers: 4 courses × 1 wythe. No flying buttresses.
          </p>
          <label>
            Outer face
            <select
              value={project.buttressFaceMode ?? "vertical"}
              onChange={(event) =>
                onButtressFaceMode?.(event.target.value as ButtressFaceMode)
              }
            >
              <option value="vertical">Vertical</option>
              <option value="taper">Taper</option>
              <option value="tiered">Tiered</option>
            </select>
          </label>
          <button type="button" onClick={() => onButtressApply?.()}>
            Apply
          </button>
        </fieldset>
      ) : null}
      {envelope ? (
        <fieldset className={styles.fieldset} data-envelope="true">
          <legend>Load envelope</legend>
          <label>
            <input
              type="checkbox"
              checked={project.loadFactorsOn !== false}
              onChange={(event) => onLoadFactors?.(event.target.checked)}
            />
            Factored (ASCE 1.2D+1.6L / 1.4D)
          </label>
          <p className={styles.note}>Unfactored toggle: uncheck. Default remains factored.</p>
          <p className={styles.metric}>1.4D</p>
          <p className={styles.metric}>1.2D+1.6L uniform</p>
          <p className={styles.metric}>1.2D+1.6L asymmetric</p>
          <p className={styles.metric}>Worst case {envelope.worstCase}</p>
          <p className={styles.metric}>
            Max point load all-green {envelope.maxPointLoad.allGreen_N} N
          </p>
          <p className={styles.metric}>
            First amber {envelope.maxPointLoad.firstAmber_N} N
          </p>
          <p className={styles.metric}>
            First red {envelope.maxPointLoad.firstRed_N} N
          </p>
        </fieldset>
      ) : null}
      {joints ? (
        <fieldset className={styles.fieldset} data-stress="true">
          <legend>Section stress</legend>
          <p className={styles.metric}>
            Max stress {Math.round(joints.maxStress)} Pa
          </p>
          <p className={styles.metric}>
            Allowable {joints.allowable} Pa
          </p>
          <p className={styles.metric}>
            Ratio {joints.ratio.toFixed(3)}
          </p>
          <p className={styles.metric}>Location {joints.location}</p>
        </fieldset>
      ) : null}
      {footings ? (
        <fieldset className={styles.fieldset} data-footings="true">
          <legend>Foundations</legend>
          <p className={styles.metric}>
            Frost line {roundShown(footings.frostLineDepth_m)} m
          </p>
          <p className={styles.metric}>
            Footing depth {roundShown(footings.defaultDepth_m)} m
          </p>
          <p className={styles.metric} data-frost-status={footings.frostStatus}>
            Frost vs depth: OK / too shallow — {footings.frostStatus}
          </p>
          <p className={styles.note}>
            Soil {footings.soilPreset}: {footings.allowableBearingPa} Pa, μ{" "}
            {footings.muSoil}. No rebar, piles, or grade beams. No frost-heave
            simulation.
          </p>
          <div className={styles.row}>
            <button type="button" onClick={() => onGenerateFootings?.()}>
              Generate footings
            </button>
            <button type="button" onClick={() => onRegenerateFootings?.(false)}>
              Regenerate
            </button>
            <button type="button" onClick={() => onRegenerateFootings?.(true)}>
              Regenerate all
            </button>
          </div>
        </fieldset>
      ) : null}
      <fieldset className={styles.fieldset} data-physics="true">
        <legend>Drop-test</legend>
        <label>
          <input
            type="checkbox"
            checked={drop?.paused !== false}
            onChange={(event) => onPhysicsPaused?.(event.target.checked)}
          />
          Pause (centering)
        </label>
        <p className={styles.metric}>Physics {drop?.result ?? "paused"}</p>
        <p className={styles.metric}>
          Combined: {combinedVerdict ?? "—"}
        </p>
        <p className={styles.note}>
          Centering under the intrados only. Overlay is the design verdict.
          Physics PASS is not a conservative pass by itself.
        </p>
        <button type="button" onClick={() => onRunDropTest?.()}>
          Remove centering
        </button>
      </fieldset>
      {leftover ? (
        <fieldset className={styles.fieldset} data-leftover="true">
          <legend>Course snap</legend>
          <p className={styles.metric}>
            {leftover.coursesFilled} courses ({leftover.snap})
          </p>
          <p className={styles.metric}>
            Leftover {leftover.leftoverHeight_in} in ({leftover.leftoverHeight_m}{" "}
            m)
          </p>
          <p className={styles.metric}>
            To next {leftover.toNextCourse_in} in ({leftover.toNextCourse_m} m)
          </p>
          <label>
            <input
              type="checkbox"
              checked={project.allowCutCourse === true}
              onChange={(event) => onAllowCutCourse(event.target.checked)}
            />
            Allow cut/leveling course
          </label>
        </fieldset>
      ) : null}
      <fieldset className={styles.fieldset}>
        <legend>Edit</legend>
        <div className={styles.row}>
          <button type="button" onClick={onUndo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo}>
            Redo
          </button>
        </div>
        {project.edges.length > 0 ? (
          <>
            <label>
              Edge
              <select
                value={selectedEdgeId}
                onChange={(event) => onSelectEdge(event.target.value)}
              >
                {project.edges.map((edge) => (
                  <option key={edge.id} value={edge.id}>
                    {edge.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Length ({us ? "in" : "m"})
              <input
                type="text"
                value={typedLength}
                onChange={(event) => onTypedLength(event.target.value)}
              />
            </label>
            <button type="button" onClick={onApplyLength}>
              Apply length
            </button>
          </>
        ) : null}
      </fieldset>
      {warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {warnings.map((warning) => (
            <li
              key={`${warning.code}:${warning.targetId ?? ""}`}
              data-warning-code={warning.code}
              className={
                warning.severity === "red"
                  ? styles.red
                  : warning.severity === "amber"
                    ? styles.amber
                    : undefined
              }
            >
              {warning.code}: {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
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
