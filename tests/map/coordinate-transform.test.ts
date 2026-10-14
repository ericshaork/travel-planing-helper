import { describe, expect, it } from "vitest";

import {
  isInChina,
  transformLngLatForAmap,
  wgs84ToGcj02,
} from "../../src/lib/map/coordinateTransform";

describe("coordinate transform utilities", () => {
  it("wgs84ToGcj02 shifts mainland China coordinates by a reasonable amount", () => {
    const [lng, lat] = wgs84ToGcj02(114.0579, 22.5431);

    expect(lng).toBeGreaterThan(114.06);
    expect(lat).toBeLessThan(22.5431);
    expect(Math.abs(lng - 114.0579)).toBeGreaterThan(0.001);
    expect(Math.abs(lat - 22.5431)).toBeGreaterThan(0.001);
  });

  it("does not transform coordinates outside mainland China", () => {
    expect(isInChina(121.5654, 25.033)).toBe(false);
    expect(wgs84ToGcj02(121.5654, 25.033)).toEqual([121.5654, 25.033]);
  });

  it("keeps [lng, lat] ordering after transform", () => {
    const transformed = transformLngLatForAmap(118.1313, 24.6656, {
      displayMode: "gcj02",
    });

    expect(transformed[0]).toBeGreaterThan(100);
    expect(transformed[1]).toBeLessThan(60);
  });

  it("raw mode returns the original coordinate", () => {
    expect(transformLngLatForAmap(114.0579, 22.5431, {
      displayMode: "raw",
    })).toEqual([114.0579, 22.5431]);
  });
});
