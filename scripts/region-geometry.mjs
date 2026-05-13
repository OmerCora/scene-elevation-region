export function normalizeRegionPath(path) {
  if (!Array.isArray(path) || !path.length) return [];
  const points = [];
  const first = path[0];
  if (typeof first === "number") {
    for (let index = 0; index < path.length - 1; index += 2) {
      points.push({ x: Number(path[index]), y: Number(path[index + 1]) });
    }
  } else {
    for (const point of path) {
      if (Array.isArray(point)) points.push({ x: Number(point[0]), y: Number(point[1]) });
      else points.push({ x: Number(point.X ?? point.x), y: Number(point.Y ?? point.y) });
    }
  }
  return points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

export function regionPaths(region, minimumPoints = 3) {
  const raw = region?.polygonTree?.toClipperPoints?.()
    ?? region?.polygons?.map(polygon => Array.from(polygon.points ?? []))
    ?? [];
  const rawPaths = typeof raw[0] === "number" || looksLikePoint(raw[0]) ? [raw] : raw;
  return rawPaths.map(normalizeRegionPath).filter(path => path.length >= minimumPoints);
}

export function pointInPolygon(point, path) {
  let inside = false;
  for (let index = 0, previous = path.length - 1; index < path.length; previous = index++) {
    const currentPoint = path[index];
    const previousPoint = path[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y);
    if (!crosses) continue;
    const denominator = (previousPoint.y - currentPoint.y) || 1e-9;
    const x = ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / denominator + currentPoint.x;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

export function pathsBounds(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  };
}

function looksLikePoint(value) {
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  return value && (Number.isFinite(value.x) || Number.isFinite(value.X));
}