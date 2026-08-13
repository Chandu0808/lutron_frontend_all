import { resolveHeatmapAreaClickPlan } from "./resolveHeatmapAreaClickPlan";

describe("resolveHeatmapAreaClickPlan", () => {
  it("skips heavy fetches when revision and area are unchanged", () => {
    expect(
      resolveHeatmapAreaClickPlan({
        areaId: 12,
        prevRevision: "t1",
        nextRevision: "t1",
        currentAreaId: 12,
      })
    ).toEqual({ fetchArea: false, fetchFloor: false });
  });

  it("fetches sidebar only when switching areas with same revision", () => {
    expect(
      resolveHeatmapAreaClickPlan({
        areaId: 20,
        prevRevision: "t1",
        nextRevision: "t1",
        currentAreaId: 12,
      })
    ).toEqual({ fetchArea: true, fetchFloor: false });
  });

  it("fetches sidebar and floor when revision changed", () => {
    expect(
      resolveHeatmapAreaClickPlan({
        areaId: 12,
        prevRevision: "t1",
        nextRevision: "t2",
        currentAreaId: 12,
      })
    ).toEqual({ fetchArea: true, fetchFloor: true });
  });

  it("syncs sidebar and floor when there is no revision baseline yet", () => {
    expect(
      resolveHeatmapAreaClickPlan({
        areaId: 12,
        prevRevision: undefined,
        nextRevision: "t1",
        currentAreaId: null,
      })
    ).toEqual({ fetchArea: true, fetchFloor: true });
  });
});
