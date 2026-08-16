import { FOOT_M } from "../catalog/units";
import { GROUND_LINE_Y } from "../geom/coords";
import type { Project } from "../model/project";
import styles from "./Sheet.module.css";

const MIN_X = -2;
const MAX_X = 12;
const MIN_Y = -2;
const MAX_Y = 8;

type Props = {
  project: Project;
};

export function Sheet({ project }: Props) {
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
