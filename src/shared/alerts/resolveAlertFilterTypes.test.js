/**
 * @jest-environment node
 */

import {
  CANONICAL_ALERT_FILTER_ORDER,
  resolveAlertFilterTypes,
} from "./resolveAlertFilterTypes";

test("uses settings-enabled api types even when no active alerts", () => {
  expect(
    resolveAlertFilterTypes({
      apiTypes: ["Ballast Failure", "Device Not Responding"],
      alerts: [],
    })
  ).toEqual(["Device Not Responding", "Ballast Failure"]);
});

test("merges types from active alerts when api list is stale", () => {
  expect(
    resolveAlertFilterTypes({
      apiTypes: ["Device Not Responding"],
      alerts: [
        { alert_type: "Device Not Responding" },
        { alert_type: "Ballast Failure" },
      ],
    })
  ).toEqual(["Device Not Responding", "Ballast Failure"]);
});

test("keeps canonical order", () => {
  const types = resolveAlertFilterTypes({
    apiTypes: ["Other Warnings", "Processor Not Responding", "Ballast Failure"],
  });
  expect(types).toEqual([
    "Processor Not Responding",
    "Ballast Failure",
    "Other Warnings",
  ]);
  expect(CANONICAL_ALERT_FILTER_ORDER).toContain("Lamp Failure");
});
