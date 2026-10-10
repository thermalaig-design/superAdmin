/** Rounds a chart's max up to a tidy number so gridlines read cleanly. */
export function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

/**
 * Smooth SVG path through the points (monotone cubic), so the curve never dips below zero or overshoots a peak.
 */
export function smoothPath(points) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;

  // Slope of each segment, then a limited tangent at every point (Fritsch–Carlson).
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  slopes.forEach((slope, i) => {
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      return;
    }
    const a = tangents[i] / slope;
    const b = tangents[i + 1] / slope;
    const h = Math.hypot(a, b);
    if (h > 3) {
      tangents[i] = (3 * a * slope) / h;
      tangents[i + 1] = (3 * b * slope) / h;
    }
  });

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = (points[i + 1].x - points[i].x) / 3;
    path += ` C${points[i].x + dx},${points[i].y + tangents[i] * dx} ${points[i + 1].x - dx},${points[i + 1].y - tangents[i + 1] * dx} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return path;
}
