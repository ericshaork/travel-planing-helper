import { afterEach, describe, expect, it, vi } from "vitest";

import { getAmapClientEnv, hasAmapClientKey } from "../../lib/map/amap-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("amap client env", () => {
  it("缺少 NEXT_PUBLIC_AMAP_JS_KEY 时返回明确缺失状态", () => {
    const env = getAmapClientEnv({});

    expect(env).toEqual({
      jsKey: null,
      securityJsCode: null,
      hasKey: false,
    });
    expect(hasAmapClientKey({})).toBe(false);
  });

  it("只读取前端 NEXT_PUBLIC_* 变量", () => {
    const env = getAmapClientEnv({
      AMAP_API_KEY: "server-only-key",
    });

    expect(env.hasKey).toBe(false);
    expect(env.jsKey).toBeNull();
  });

  it("读取并裁剪 NEXT_PUBLIC_AMAP_JS_KEY 和安全码", () => {
    const env = getAmapClientEnv({
      NEXT_PUBLIC_AMAP_JS_KEY: "  browser-key  ",
      NEXT_PUBLIC_AMAP_SECURITY_JS_CODE: "  sec-code  ",
      AMAP_API_KEY: "server-only-key",
    });

    expect(env).toEqual({
      jsKey: "browser-key",
      securityJsCode: "sec-code",
      hasKey: true,
    });
    expect(hasAmapClientKey({
      NEXT_PUBLIC_AMAP_JS_KEY: " browser-key ",
    })).toBe(true);
  });

  it("默认读取路径直接使用 process.env.NEXT_PUBLIC_*", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "  browser-key  ");
    vi.stubEnv("NEXT_PUBLIC_AMAP_SECURITY_JS_CODE", "  sec-code  ");

    const env = getAmapClientEnv();

    expect(env).toEqual({
      jsKey: "browser-key",
      securityJsCode: "sec-code",
      hasKey: true,
    });
    expect(hasAmapClientKey()).toBe(true);
  });
});
