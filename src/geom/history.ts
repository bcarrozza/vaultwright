import type { Project } from "../model/project";

export type HistoryState = {
  past: Project[];
  present: Project;
  future: Project[];
};

export function createHistory(present: Project): HistoryState {
  return { past: [], present: structuredClone(present), future: [] };
}

export function pushHistory(state: HistoryState, next: Project): HistoryState {
  return {
    past: [...state.past, state.present],
    present: structuredClone(next),
    future: [],
  };
}

export function undo(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const present = state.past[state.past.length - 1]!;
  return {
    past: state.past.slice(0, -1),
    present,
    future: [state.present, ...state.future],
  };
}

export function redo(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const present = state.future[0]!;
  return {
    past: [...state.past, state.present],
    present,
    future: state.future.slice(1),
  };
}

export function replacePresent(
  state: HistoryState,
  present: Project,
): HistoryState {
  return { ...state, present: structuredClone(present) };
}
