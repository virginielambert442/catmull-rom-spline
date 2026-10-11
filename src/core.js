/**
 * Core Catmull-Rom spline evaluation.
 *
 * The Catmull-Rom spline passes through every control point, which makes it
 * attractive for animation and path work where the keyframes must be honoured
 * exactly. The trade-off: it is C1 continuous (tangent-matched) but not C2
 * (curvature-matched), so sharp direction changes can produce visible kinks.
 *
 * This module implements the uniform centripetal-free ("uniform") variant.
 * We chose uniform parameterisation over chord-length or centripetal because
 * it is the form most callers expect when they ask for "Catmull-Rom" and it
 * keeps the API to a single, predictable function. Centripetal splines reduce
 * self-intersection loops but add parameterisation complexity that this
 * library deliberately does not expose.
 */

/**
 * Evaluate a single segment of a Catmull-Rom spline at parameter t in [0, 1].
 *
 * The segment is defined by four control points p0..p3. The curve passes
 * through p1 (at t=0) and p2 (at t=1); p0 and p3 provide tangent direction.
 *
 * We use the standard cubic basis:
 *   q(t) = 0.5 * ((2*p1) + (-p0 + p2)*t + (2*p0 - 5*p1 + 4*p2 - p3)*t^2 + (-p0 + 3*p1 - 3*p2 + p3)*t^3)
 *
 * This is the most common closed form and matches the behaviour of graphics
 * libraries that document "Catmull-Rom" without further qualification.
 *
 * @param {number[]} p0 - First control point (tangent source).
 * @param {number[]} p1 - Segment start (curve passes through here at t=0).
 * @param {number[]} p2 - Segment end (curve passes through here at t=1).
 * @param {number[]} p3 - Last control point (tangent source).
 * @param {number} t - Parameter in [0, 1].
 * @returns {number[]} Interpolated point, same dimensionality as the inputs.
 */
export function catmullRomSegment(p0, p1, p2, p3, t) {
  const dim = p1.length;
  const out = new Array(dim);

  const t2 = t * t;
  const t3 = t2 * t;

  // Basis function coefficients for uniform Catmull-Rom.
  const c0 = 2 * p1;
  const c1 = -p0 + p2;
  const c2 = 2 * p0 - 5 * p1 + 4 * p2 - p3;
  const c3 = -p0 + 3 * p1 - 3 * p2 + p3;

  for (let i = 0; i < dim; i++) {
    out[i] = 0.5 * (c0[i] + c1[i] * t + c2[i] * t2 + c3[i] * t3);
  }

  return out;
}

/**
 * Sample a Catmull-Rom spline through a sequence of control points.
 *
 * Produces `samplesPerSegment` points per interior segment, so the total
 * returned length is (points.length - 1) * samplesPerSegment. The final control
 * point is included as the last sample of the last segment, so the curve is
 * closed under resampling.
 *
 * Edge cases the implementation actually handles:
 *  - Fewer than two control points: returns a copy of the input (or empty).
 *  - Exactly two control points: linearly interpolates between them, since a
 *    single Catmull-Rom segment needs four points and we fall back to a line
 *    rather than inventing phantom tangents that would mislead callers.
 *
 * The `closed` flag, when true, treats the point list as a loop: the first
 * point is used as the p3 tangent of the last segment and the last point as
 * the p0 tangent of the first segment. This produces a continuous closed
 * curve without duplicating endpoints.
 *
 * @param {number[][]} points - Control points. Each must be an array of numbers.
 * @param {object} [options]
 * @param {number} [options.samplesPerSegment=16] - Samples per interior segment.
 * @param {boolean} [options.closed=false] - Treat the point list as a loop.
 * @returns {number[][]} Spline samples.
 */
export function catmullRomSpline(points, options = {}) {
  const { samplesPerSegment = 16, closed = false } = options;

  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  // Normalise: every point must be an array of numbers. We copy to avoid
  // mutating caller data and to guarantee consistent dimensionality checks.
  const pts = points.map((p) => {
    if (!Array.isArray(p)) {
      throw new TypeError("Each control point must be an array of numbers.");
    }
    return Array.from(p, (v) => {
      if (typeof v !== "number" || Number.isNaN(v)) {
        throw new TypeError("Control point components must be finite numbers.");
      }
      return v;
    });
  });

  const n = pts.length;

  if (n === 1) {
    return [pts[0].slice()];
  }

  if (n === 2) {
    // Linear fallback: not enough points for a real Catmull-Rom segment.
    const result = [];
    for (let i = 0; i < samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      result.push(pts[0].map((v, j) => v + (pts[1][j] - v) * t));
    }
    result.push(pts[1].slice());
    return result;
  }

  const result = [];
  const segmentCount = closed ? n : n - 1;

  for (let s = 0; s < segmentCount; s++) {
    const p0 = pts[(s - 1 + n) % n];
    const p1 = pts[s % n];
    const p2 = pts[(s + 1) % n];
    const p3 = pts[(s + 2) % n];

    // On the last open segment we do not include t=1 here because it equals
    // the final control point; we append it once after the loop. For closed
    // curves every segment's t=1 is the next segment's t=0, so we also skip
    // the endpoint to avoid duplicates, then append the first point at the end.
    const last = s === segmentCount - 1;
    for (let i = 0; i < samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      result.push(catmullRomSegment(p0, p1, p2, p3, t));
    }
    if (last) {
      result.push(catmullRomSegment(p0, p1, p2, p3, 1));
    }
  }

  return result;
}
