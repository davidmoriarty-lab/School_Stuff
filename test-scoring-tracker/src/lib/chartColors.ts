// Validated categorical palette (light surface), in fixed slot order. A series keeps its slot for as long
// as it is on screen; slots are never cycled or generated.
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const SERIES_NAMES = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red"];

// Marker shapes give a second, non-color way to tell series apart.
export const SHAPES = ["circle", "square", "diamond", "triangle", "circle", "square", "diamond", "triangle"] as const;
export type Shape = (typeof SHAPES)[number];

export const INK = {
  primary: "#0f172a",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
  context: "#a8a6a0", // de-emphasised "everything else" series, such as a class average
};

// One-hue magnitude ramp (blue) for single-series bars.
export const BAR = "#2a78d6";
export const BAR_TRACK = "#eef2f9";
