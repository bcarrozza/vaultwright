import { circularArc } from "../geom/arch";
import { FOOT_M } from "../catalog/units";
import { GROUND_LINE_Y } from "../geom/coords";
import { facePolygon, isVoidKind, vertexById } from "../geom/graph";
import type { ThrustAnalysis } from "../analysis/types";
import type { MemberLine } from "../analysis/multiSpan";
import type { OptimizePreview } from "../analysis/optimize";
import type { Point } from "../geom/arch";
import type { Stone2D } from "../masonry/types";
import type { Project } from "../model/project";
import styles from "./Sheet.module.css";

const MIN_X = -2;
const MAX_X = 12;
const MIN_Y = -2;
const MAX_Y = 8;

type Props = {
  project: Project;
  stones?: Stone2D[];
  thrust?: ThrustAnalysis | null;
  crushing?: boolean;
  optimize?: OptimizePreview | null;
  memberLines?: MemberLine[];
  centering?: Point[] | null;
  physicsPaused?: boolean;
};

export function Sheet({
  project,
  stones = [],
  thrust = null,
  crushing = false,
  optimize = null,
  memberLines = [],
  centering = null,
  physicsPaused = true,
}: Props) {
  const width = MAX_X - MIN_X;
  const height = MAX_Y - MIN_Y;
  const us = project.units === "us-customary";
  const barLengthM = us ? 10 * FOOT_M : 1;
  const barLabel = us ? "10 ft" : "1 m";
  const barX = MIN_X + 0.6;
  const barY = MIN_Y + 0.55;

  return (
    <svg
      className={styles.sheet}
      viewBox={`${MIN_X} ${-MAX_Y} ${width} ${height}`}
      role="img"
      aria-label="Drawing sheet"
    >
      <rect
        className={styles.paper}
        x={MIN_X}
        y={-MAX_Y}
        width={width}
        height={height}
      />
      <g transform="scale(1,-1)">
        {project.faces.map((face) => {
          const verts = facePolygon(project, face);
          const points = verts.map((v) => `${v.x},${v.y}`).join(" ");
          const voidFace = isVoidKind(face.regionKind);
          return (
            <polygon
              key={face.id}
              className={voidFace ? styles.voidFace : styles.face}
              data-face-id={face.id}
              data-region-kind={face.regionKind}
              points={points}
            />
          );
        })}
        {stones.map((stone) => {
          const points = stone.polygon.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <polygon
              key={stone.id}
              className={styles.stone}
              data-stone-id={stone.id}
              data-stone-role={stone.role}
              data-course-index={stone.courseIndex}
              points={points}
            />
          );
        })}
        {thrust
          ? thrust.segments.map((seg, i) => (
              <line
                key={`thrust-${i}`}
                className={
                  seg.color === "green"
                    ? styles.thrustGreen
                    : seg.color === "amber"
                      ? styles.thrustAmber
                      : styles.thrustRed
                }
                data-thrust="true"
                data-thrust-color={seg.color}
                data-color-per-brick="false"
                data-kern={thrust.kern}
                x1={seg.from.x}
                y1={seg.from.y}
                x2={seg.to.x}
                y2={seg.to.y}
                fill="none"
              />
            ))
          : null}
        {memberLines.map((line) => (
          <g
            key={line.id}
            data-member-id={line.id}
            data-member-color={line.color}
            data-full-length="true"
          >
            {line.polyline.slice(0, -1).map((p, i) => {
              const q = line.polyline[i + 1]!;
              return (
                <line
                  key={`${line.id}-${i}`}
                  data-thrust="true"
                  data-member-line="true"
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  stroke={line.color}
                  strokeWidth={0.035}
                  fill="none"
                />
              );
            })}
          </g>
        ))}
        {crushing ? (
          <circle
            data-crushing="true"
            cx={3.35}
            cy={3.35}
            r={0.08}
            className={styles.thrustRed}
            fill="#b33a3a"
          />
        ) : null}
        {project.edges.map((edge) => {
          const start = vertexById(project, edge.start);
          const end = vertexById(project, edge.end);
          if (edge.kind === "arch" && edge.rise != null && edge.rise > 0) {
            const arc = circularArc(start, end, edge.rise);
            const large = Math.abs(arc.sweep) > Math.PI ? 1 : 0;
            const sweep = arc.sweep > 0 ? 1 : 0;
            return (
              <path
                key={edge.id}
                className={styles.edge}
                data-edge-id={edge.id}
                data-arch-family={edge.archFamily ?? "circular"}
                data-arch-initial="true"
                strokeDasharray={optimize ? "0.12 0.08" : undefined}
                d={`M ${start.x} ${start.y} A ${arc.r} ${arc.r} 0 ${large} ${sweep} ${end.x} ${end.y}`}
                fill="none"
              />
            );
          }
          return (
            <line
              key={edge.id}
              className={styles.edge}
              data-edge-id={edge.id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}
        {optimize
          ? project.edges
              .filter((e) => e.kind === "arch" && e.archFamily === "circular")
              .map((edge) => {
                const start = vertexById(project, edge.start);
                const end = vertexById(project, edge.end);
                if (edge.rise == null) return null;
                const arc = circularArc(start, end, optimize.rOpt);
                const large = Math.abs(arc.sweep) > Math.PI ? 1 : 0;
                const sweep = arc.sweep > 0 ? 1 : 0;
                return (
                  <path
                    key={`opt-${edge.id}`}
                    className={styles.edge}
                    data-arch-optimized="true"
                    d={`M ${start.x} ${start.y} A ${arc.r} ${arc.r} 0 ${large} ${sweep} ${end.x} ${end.y}`}
                    fill="none"
                    strokeWidth={0.04}
                  />
                );
              })
          : null}
        {physicsPaused && centering && centering.length > 1 ? (
          <polyline
            data-centering="true"
            data-intrados-only="true"
            fill="none"
            stroke="#c4a35a"
            strokeWidth={0.05}
            points={centering.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        ) : null}
        <line
          className={styles.ground}
          data-ground-line="true"
          data-ground-y={GROUND_LINE_Y}
          x1={MIN_X}
          y1={GROUND_LINE_Y}
          x2={MAX_X}
          y2={GROUND_LINE_Y}
          stroke="#1a1a1a"
          strokeWidth={0.04}
        />
        <g transform={`translate(0.3 ${GROUND_LINE_Y + 0.15}) scale(1,-1)`}>
          <text className={styles.label} x={MIN_X + 0.1} y={0}>
            Ground y = 0
          </text>
        </g>
        <g
          data-scale-bar="true"
          transform={`translate(${barX} ${barY})`}
        >
          <line
            className={styles.scale}
            x1={0}
            y1={0}
            x2={barLengthM}
            y2={0}
            stroke="#1a1a1a"
            strokeWidth={0.03}
          />
          <line
            className={styles.scale}
            x1={0}
            y1={-0.08}
            x2={0}
            y2={0.08}
            stroke="#1a1a1a"
            strokeWidth={0.03}
          />
          <line
            className={styles.scale}
            x1={barLengthM}
            y1={-0.08}
            x2={barLengthM}
            y2={0.08}
            stroke="#1a1a1a"
            strokeWidth={0.03}
          />
          <g transform="scale(1,-1)">
            <text className={styles.label} x={barLengthM / 2} y={-0.2} textAnchor="middle">
              {barLabel}
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}
