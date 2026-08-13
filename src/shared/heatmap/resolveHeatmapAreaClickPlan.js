/**
 * Decide heatmap area-click fetches from floor status revision.
 * revision unchanged + same area → no heavy APIs
 * revision unchanged + new area → sidebar only
 * revision changed → sidebar + full floor map
 */
export function resolveHeatmapAreaClickPlan({
  areaId,
  prevRevision,
  nextRevision,
  currentAreaId,
}) {
  const sameAreaOpen = Number(currentAreaId) === Number(areaId);
  const hasPrev =
    prevRevision != null && String(prevRevision) !== "";
  const revisionChanged =
    hasPrev && String(prevRevision) !== String(nextRevision ?? "");

  // No baseline yet: sync sidebar + map once, then remember revision.
  if (!hasPrev) {
    return { fetchArea: true, fetchFloor: true };
  }

  if (!revisionChanged) {
    if (sameAreaOpen) {
      return { fetchArea: false, fetchFloor: false };
    }
    return { fetchArea: true, fetchFloor: false };
  }
  return { fetchArea: true, fetchFloor: true };
}
