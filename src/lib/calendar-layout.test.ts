import { describe, expect, it } from "vitest";
import {
  CAL_PX_PER_HOUR,
  categoryColor,
  formatMinutes,
  layoutCalendarBlock,
  timeLabels,
} from "./calendar-layout";

describe("calendar layout", () => {
  it("maps start/end times to top and height from 07:00 baseline", () => {
    const startAt = new Date(2025, 4, 14, 7, 30);
    const endAt = new Date(2025, 4, 14, 8, 15);
    const layout = layoutCalendarBlock({ startAt, endAt });
    expect(layout.top).toBeCloseTo((30 / 60) * CAL_PX_PER_HOUR);
    expect(layout.height).toBeCloseTo((45 / 60) * CAL_PX_PER_HOUR);
  });

  it("builds hourly labels", () => {
    expect(timeLabels(7, 9)).toEqual(["07:00", "08:00", "09:00"]);
  });

  it("maps categories and formats minutes", () => {
    expect(categoryColor("training")).toBe("blue");
    expect(categoryColor("leisure")).toBe("green");
    expect(categoryColor(null, "fixed_commitment")).toBe("neutral");
    expect(formatMinutes(125)).toBe("2h 5m");
  });
});
