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
