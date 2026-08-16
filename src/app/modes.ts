export type AppMode = "edit-outline" | "masonry" | "analyze" | "physics";

export const APP_MODES: { id: AppMode; label: string }[] = [
  { id: "edit-outline", label: "Edit outline" },
  { id: "masonry", label: "Masonry" },
  { id: "analyze", label: "Analyze" },
  { id: "physics", label: "Physics" },
];
