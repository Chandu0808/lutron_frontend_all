/** @jest-environment node */

import { configureStore } from "@reduxjs/toolkit";
import usersReducer, { updateUser } from "./usersSlice";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();

jest.mock("../../../../BaseUrl", () => ({
  BaseUrl: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
  },
}));

describe("usersSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };
    localStorage.setItem("lutron", "test-token");
  });

  it("updateUser fulfilled merges user into usersList", async () => {
    const store = configureStore({
      reducer: { users: usersReducer },
      preloadedState: {
        users: {
          usersList: [
            { id: 1, name: "Old", email: "a@b.com", role: "Admin" },
          ],
          loading: false,
          error: null,
          deleteLoading: false,
          deleteError: null,
          updateLoading: false,
          updateError: null,
        },
      },
    });

    mockPatch.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          id: 1,
          name: "New",
          email: "a@b.com",
          role: "Admin",
        },
      },
    });

    await store.dispatch(
      updateUser({ userId: 1, body: { name: "New" } })
    ).unwrap();

    expect(mockPatch).toHaveBeenCalledWith(
      "/users/1",
      { name: "New" },
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
      })
    );
    expect(store.getState().users.usersList[0].name).toBe("New");
    expect(store.getState().users.updateLoading).toBe(false);
  });

  it("updateUser rejected sets updateError", async () => {
    const store = configureStore({
      reducer: { users: usersReducer },
      preloadedState: {
        users: {
          usersList: [],
          loading: false,
          error: null,
          deleteLoading: false,
          deleteError: null,
          updateLoading: false,
          updateError: null,
        },
      },
    });

    mockPatch.mockRejectedValueOnce({
      response: { data: { detail: "not allowed" } },
    });

    await expect(
      store.dispatch(updateUser({ userId: 9, body: { name: "X" } })).unwrap()
    ).rejects.toBeDefined();

    expect(store.getState().users.updateError).toBe("not allowed");
  });

  it("updateUser formats array validation detail", async () => {
    const store = configureStore({
      reducer: { users: usersReducer },
      preloadedState: {
        users: {
          usersList: [],
          loading: false,
          error: null,
          deleteLoading: false,
          deleteError: null,
          updateLoading: false,
          updateError: null,
        },
      },
    });

    mockPatch.mockRejectedValueOnce({
      response: {
        data: {
          detail: [{ msg: "field required", type: "missing" }],
        },
      },
    });

    await expect(
      store.dispatch(updateUser({ userId: 1, body: {} })).unwrap()
    ).rejects.toBeDefined();

    expect(store.getState().users.updateError).toContain("field required");
  });
});
