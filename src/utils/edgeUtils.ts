/**
 * Compute a quadratic Bézier arc path with a freely-positioned control point.
 * `arcOffset` is the displacement of the control point from the straight-line midpoint
 * (after parallel-edge spacing is applied).
 *
 * The target endpoint is pulled back along the incoming tangent so that
 * the SVG arrowhead tip lands at the original handle position.
 *
 * Returns the SVG path, the visual midpoint (Bézier at t=0.5), and the control point position.
 */
export function getOffsetArcPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetPx: number,
  arcOffset: { x: number; y: number },
): { path: string; midX: number; midY: number; cx: number; cy: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return { path: `M ${sourceX},${sourceY} L ${targetX},${targetY}`, midX: sourceX, midY: sourceY, cx: sourceX, cy: sourceY };
  }

  // Perpendicular unit vector (rotated 90° CCW)
  const px = -dy / len;
  const py = dx / len;

  // Offset start/end for parallel edge spacing
  const sx = sourceX + px * offsetPx;
  const sy = sourceY + py * offsetPx;
  const tx = targetX + px * offsetPx;
  const ty = targetY + py * offsetPx;

  // Control point: midpoint + user offset
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const cx = mx + arcOffset.x;
  const cy = my + arcOffset.y;

  // Pull back the target endpoint along the incoming tangent (control→target)
  // so the arrowhead tip lands at the original handle position.
  // React Flow's ArrowClosed marker is ~5px from refX to tip.
  const ARROW_PULLBACK = 5;
  const tanDx = tx - cx;
  const tanDy = ty - cy;
  const tanLen = Math.sqrt(tanDx * tanDx + tanDy * tanDy);
  let txAdj = tx;
  let tyAdj = ty;
  if (tanLen > 0) {
    txAdj = tx - (tanDx / tanLen) * ARROW_PULLBACK;
    tyAdj = ty - (tanDy / tanLen) * ARROW_PULLBACK;
  }

  // Point on quadratic Bézier at t=0.5: B(0.5) = 0.25*P0 + 0.5*C + 0.25*P1
  const midX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
  const midY = 0.25 * sy + 0.5 * cy + 0.25 * ty;

  return { path: `M ${sx},${sy} Q ${cx},${cy} ${txAdj},${tyAdj}`, midX, midY, cx, cy };
}

/**
 * Compute the default arc offset (perpendicular to the edge) for a given edge.
 */
export function getDefaultArcOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  magnitude: number = 50,
): { x: number; y: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: -magnitude };
  return { x: (-dy / len) * magnitude, y: (dx / len) * magnitude };
}

/**
 * Compute a straight SVG path offset perpendicularly from the source→target line.
 */
export function getOffsetStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetPx: number,
): { path: string; midX: number; midY: number } {
  if (offsetPx === 0) {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    return { path: `M ${sourceX},${sourceY} L ${targetX},${targetY}`, midX, midY };
  }

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return { path: `M ${sourceX},${sourceY} L ${targetX},${targetY}`, midX: sourceX, midY: sourceY };
  }

  // Perpendicular unit vector (rotated 90° CCW)
  const px = -dy / len;
  const py = dx / len;

  const sx = sourceX + px * offsetPx;
  const sy = sourceY + py * offsetPx;
  const tx = targetX + px * offsetPx;
  const ty = targetY + py * offsetPx;

  return {
    path: `M ${sx},${sy} L ${tx},${ty}`,
    midX: (sx + tx) / 2,
    midY: (sy + ty) / 2,
  };
}
