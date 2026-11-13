import { describe, expect, it } from "vitest";
import { errorState, isEmptyList, loadingState, successState } from "./resource-state";

describe("resource state", () => {
  it("builds loading, success, and error variants", () => {
    expect(loadingState()).toEqual({ status: "loading", data: null, error: null });
    expect(successState({ id: 1 })).toEqual({ status: "success", data: { id: 1 }, error: null });
    const err = new Error("fail");
    expect(errorState(err)).toEqual({ status: "error", data: null, error: err });
  });

  it("detects empty list data", () => {
    expect(isEmptyList([])).toBe(true);
    expect(isEmptyList([{ id: 1 }])).toBe(false);
    expect(isEmptyList(null)).toBe(false);
  });
});
