# catmull-rom-spline

Interpolates smooth curves through control points using the Catmull-Rom basis functions. The curve passes through every supplied point, which makes it suitable for animation keyframes, path generation, and any context where the control points must be honoured exactly.

## Usage

```js
import { catmullRomSpline, catmullRomSegment } from "catmull-rom-spline";

const points = [
  [0, 0],
  [1, 2],
  [3, 1],
  [4, 0],
];

const samples = catmullRomSpline(points, { samplesPerSegment: 16, closed: false });

// Evaluate a single segment directly between four control points:
const p = catmullRomSegment([0, 0], [1, 2], [3, 1], [4, 0], 0.5);
```

`catmullRomSpline(points, options?)` returns a flat array of `[x, y, ...]` samples. `options.samplesPerSegment` (default 16) controls density. `options.closed` (default false) treats the point list as a loop.

`catmullRomSegment(p0, p1, p2, p3, t)` evaluates one cubic segment at parameter `t` in `[0, 1]`. The curve passes through `p1` at `t=0` and `p2` at `t=1`; `p0` and `p3` supply tangent direction.

## Why this exists

The library exists for the case where you need a curve that hits every control point and you need it in pure ESM with no dependencies. Catmull-Rom is C1 continuous (tangent-matched) but not C2 (curvature-matched), so direction changes can produce visible kinks. We chose uniform parameterisation over chord-length or centripetal variants because it is the form most callers expect under the name "Catmull-Rom" and it keeps the surface area to two functions. If you need self-intersection-free loops, use a centripetal implementation instead.

## Edge cases you will hit

- Fewer than two control points returns an empty array; a single point returns a copy of that point.
- Exactly two control points falls back to linear interpolation. A real Catmull-Rom segment needs four points, and inventing phantom tangents would mislead callers about the curve shape.
- The closed flag reuses the first and last points as each other's tangent neighbours, so do not duplicate endpoints when passing `closed: true`.

## Tests

`node --test` runs the suite under `node:test` and `node:assert/strict`.
