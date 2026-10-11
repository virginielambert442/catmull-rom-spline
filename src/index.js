/**
 * Public entry point for catmull-rom-spline.
 *
 * Re-exports the spline evaluation helpers from ./core.js so callers can
 * import everything from the package root.
 */
export { catmullRomSegment, catmullRomSpline } from "./core.js";
