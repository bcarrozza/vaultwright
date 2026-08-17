export type Point = { x: number; y: number };

export type JointColor = "green" | "amber" | "red";

export type ThrustJoint = {
  kind: "radial" | "wall-bed" | "footing";
  x: number;
  y: number;
  phi?: number;
  e: number;
  t: number;
  kern: number;
  color: JointColor;
};

export type ThrustSegment = {
  from: Point;
  to: Point;
  color: JointColor;
};

export type ThreeHingedRef = {
  H_N: number;
  VA_N: number;
  VB_N: number;
  eccentricityAtHinges_m: number;
  springingAngleFromVertical_deg: number;
};

export type ThrustAnalysis = {
  kern: "full-ring-and-wall";
  coreDrawn: false;
  density_ring: number;
  Nv: number;
  t_m: number;
  R_centerline_m: number;
  sliceDepth_m: number;
  W_each_N: number;
  W_tot_N: number;
  factor: number;
  threeHinged: ThreeHingedRef;
  designH_N: number;
  polyline: Point[];
  segments: ThrustSegment[];
  joints: ThrustJoint[];
  maxAbsE_m: number;
  maxAbsE_over_kern: number;
  designPass: boolean;
  lineContinuesDownWalls: true;
  colorPerBrick: false;
};

export type DeadLoadThrustMetrics = {
  kern: "full-ring-and-wall";
  coreDrawn: false;
  loadCaseForReference: "dead-only-unfactored";
  density_ring: number;
  Nv: number;
  t_m: number;
  R_centerline_m: number;
  sliceDepth_m: number;
  W_each_N: number;
  W_tot_N: number;
  threeHinged: {
    H_N: number;
    VA_N: number;
    VB_N: number;
    toleranceRel: number;
    eccentricityAtHinges_m: number;
    springingAngleFromVertical_deg: number;
    note: string;
  };
  factoredDeadOnly_1_4D: {
    H_N: number;
    toleranceRel: number;
    note: string;
  };
  designH: {
    method: "kern-search DEC-051 / ADR-005";
    passRule: "all joints green, no slide, no crush";
    amberIsNotPass: true;
  };
  lineContinuesDownWalls: true;
  colorPerBrick: false;
};
