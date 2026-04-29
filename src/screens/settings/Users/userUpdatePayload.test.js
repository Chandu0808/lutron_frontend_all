/** @jest-environment node */

import {
  apiToPermissionLabel,
  buildUserPatchBody,
  hasUserUpdateChanges,
  serializeFloorsSelection,
} from "./userUpdatePayload";

describe("userUpdatePayload", () => {
  test("apiToPermissionLabel maps backend enums", () => {
    expect(apiToPermissionLabel("monitor")).toBe("Monitoring Only");
    expect(apiToPermissionLabel("monitor_control")).toBe(
      "Monitoring and control"
    );
    expect(apiToPermissionLabel("MONITOR_CONTROL_EDIT")).toBe(
      "Monitoring, edit and control"
    );
  });

  test("buildUserPatchBody name-only for Admin", () => {
    expect(
      buildUserPatchBody({
        name: "New",
        initialName: "Old",
        email: "a@b.com",
        initialEmail: "a@b.com",
        password: "",
        isOperator: false,
        selectedFloors: [],
        initialFloorsJson: "[]",
      })
    ).toEqual({ name: "New" });
  });

  test("buildUserPatchBody omits password when blank", () => {
    expect(
      buildUserPatchBody({
        name: "Same",
        initialName: "Same",
        email: "a@b.com",
        initialEmail: "a@b.com",
        password: "   ",
        isOperator: false,
        selectedFloors: [],
        initialFloorsJson: "[]",
      })
    ).toEqual({});
  });

  test("buildUserPatchBody includes email when changed", () => {
    expect(
      buildUserPatchBody({
        name: "Same",
        initialName: "Same",
        email: "new@b.com",
        initialEmail: "old@b.com",
        password: "",
        isOperator: false,
        selectedFloors: [],
        initialFloorsJson: "[]",
      })
    ).toEqual({ email: "new@b.com" });
  });

  test("buildUserPatchBody operator floor permission change", () => {
    const floors = [{ id: 10, permission: "Monitoring and control" }];
    const initial = serializeFloorsSelection([
      { id: 10, permission: "Monitoring Only" },
    ]);
    const body = buildUserPatchBody({
      name: "Bob",
      initialName: "Bob",
      email: "bob@b.com",
      initialEmail: "bob@b.com",
      password: "",
      isOperator: true,
      selectedFloors: floors,
      initialFloorsJson: initial,
    });
    expect(body).toEqual({
      floor: [{ floor_id: 10, floor_permission: "monitor_control" }],
    });
  });

  test("hasUserUpdateChanges false when nothing changed", () => {
    expect(
      hasUserUpdateChanges({
        name: "A",
        initialName: "A",
        email: "a@b.com",
        initialEmail: "a@b.com",
        password: "",
        isOperator: false,
        selectedFloors: [],
        initialFloorsJson: "[]",
      })
    ).toBe(false);
  });
});
