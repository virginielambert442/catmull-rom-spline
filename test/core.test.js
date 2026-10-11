import { test } from "node:test";
import assert from "node:assert/strict";
import { catmullRomSegment, catmullRomSpline } from "../src/core.js";

/**
 * Float comparison helper. We never use == on floats; instead we require
 * results within an absolute tolerance. The spline coefficients are exact
 * rationals for nice inputs, but sampling introduces division by samplesPerSegment,
 * so we keep a small epsilon.
 */
function approxEqual(a, b, eps = 1e-9) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > eps) return false;
  }
  return true;
}

test("segment passes through p1 at t=0 and p2 at t=1", () => {
  const p0 = [0, 0];
  const p1 = [1, 2];
  const p2 = [3, 3];
  const p3 = [4, 0];

  const at0 = catmullRomSegment(p0, p1, p2, p3, 0);
  const at1 = catmullRomSegment(p0, p1, p2, p3, 1);

  assert.ok(approxEqual(at0, p1));
  assert.ok(approxEqual(at1, p2));
});

test("segment midpoint matches the known Catmull-Rom value", () => {
  // For p0=(0,0) p1=(1,1) p2=(2,1) p3=(3,0), t=0.5 the uniform Catmull-Rom
  // formula gives (1.5, 1.125). This is a hand-computed reference value used
  // to guard against basis-function regressions.
  const p0 = [0, 0];
  const p1 = [1, 1];
  const p2 = [2, 1];
  const p3 = [3, 0];

  const mid = catmullRomSegment(p0, p1, p2, p3, 0.5);
  assert.ok(approxEqual(mid, [1.5, 1.125]));
});

test("segment works for 3D points", () => {
  const p0 = [0, 0, 0];
  const p1 = [1, 1, 1];
  const p2 = [2, 1, 0];
  const p3 = [3, 0, -1];

  const at0 = catmullRomSegment(p0, p1, p2, p3, 0);
  const at1 = catmullRomSegment(p0, p1, p2, p3, 1);

  assert.ok(approxEqual(at0, p1));
  assert.ok(approxEqual(at1, p2));
});

test("spline returns empty array for empty input", () => {
  assert.deepEqual(catmullRomSpline([]), []);
});

test("spline returns a copy of the single point for one-point input", () => {
  const result = catmullRomSpline([[5, 7]]);
  assert.deepEqual(result, [[5, 7]]);
  // Ensure it is a copy, not the same reference.
  assert.notEqual(result[0], [5, 7]);
});

test("spline linearly interpolates for exactly two points", () => {
  const result = catmullRomSpline([[0, 0], [10, 20]], { samplesPerSegment: 2 });
  // samplesPerSegment=2 gives samples at t=0, 0.5, then the final point at t=1.
  assert.equal(result.length, 3);
  assert.ok(approxEqual(result[0], [0, 0]));
  assert.ok(approxEqual(result[1], [5, 10]));
  assert.ok(approxEqual(result[2], [10, 20]));
});

test("spline passes through every control point (open curve)", () => {
  const pts = [[0, 0], [1, 2], [3, 1], [4, 0]];
  const result = catmullRomSpline(pts, { samplesPerSegment: 4 });

  // With 3 segments and 4 samples per segment plus the final endpoint,
  // total length = 3 * 4 + 1 = 13.
  assert.equal(result.length, 13);

  // The curve should pass through each original control point. Those occur at
  // indices 0, 4, 8, and 12.
  assert.ok(approxEqual(result[0], pts[0]));
  assert.ok(approxEqual(result[4], pts[1]));
  assert.ok(approxEqual(result[8], pts[2]));
  assert.ok(approxEqual(result[12], pts[3]));
});

test("spline respects samplesPerSegment option", () => {
  const pts = [[0, 0], [1, 1], [2, 0]];
  const result = catmullRomSpline(pts, { samplesPerSegment: 10 });
  // 2 segments * 10 samples + 1 final endpoint.
  assert.equal(result.length, 21);
});

test("closed spline loops back to the first point", () => {
  const pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const result = catmullRomSpline(pts, { samplesPerSegment: 3, closed: true });

  // 4 segments * 3 samples + 1 closing endpoint.
  assert.equal(result.length, 13);

  // First and last samples should coincide (the loop closes).
  assert.ok(approxEqual(result[0], result[12]));
  assert.ok(approxEqual(result[0], pts[0]));
});

test("spline does not mutate the input points", () => {
  const pts = [[0, 0], [1, 2], [3, 1]];
  const snapshot = pts.map((p) => p.slice());
  catmullRomSpline(pts, { samplesPerSegment: 5 });
  assert.deepEqual(pts, snapshot);
});

test("spline rejects non-numeric components", () => {
  assert.throws(
    () => catmullRomSpline([[0, 0], [1, "x"], [2, 0]]),
    { name: "TypeError" }
  );
});

test("spline rejects NaN components", () => {
  assert.throws(
    () => catmullRomSpline([[0, 0], [NaN, 1], [2, 0]]),
    { name: "TypeError" }
  );
});
