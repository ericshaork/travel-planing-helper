import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AMapGlobal, AMapMapConstructor } from "../../lib/map/amap-types";

type MockScript = HTMLScriptElement & {
  dispatch: (type: "load" | "error") => void;
  removed: boolean;
};

interface MockDomHarness {
  document: Document;
  scripts: MockScript[];
  getLatestScript: () => MockScript | undefined;
}

function createMockScript(onRemove: (script: MockScript) => void): MockScript {
  const listeners = new Map<string, Array<() => void>>();

  const script = {
    id: "",
    src: "",
    async: false,
    defer: false,
    dataset: {},
    removed: false,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const callback =
        typeof listener === "function"
          ? () => listener(new Event(type))
          : () => listener.handleEvent(new Event(type));
      const queue = listeners.get(type) ?? [];
      queue.push(callback);
      listeners.set(type, queue);
    },
    dispatch(type: "load" | "error") {
      for (const callback of listeners.get(type) ?? []) {
        callback();
      }
    },
    remove() {
      script.removed = true;
      onRemove(script);
    },
  } as unknown as MockScript;

  return script;
}

function createMockDomHarness(): MockDomHarness {
  const scripts: MockScript[] = [];
  const scriptsById = new Map<string, MockScript>();

  const document = {
    head: {
      appendChild(node: Node) {
        const script = node as MockScript;
        scripts.push(script);
        if (script.id) {
          scriptsById.set(script.id, script);
        }
        return node;
      },
    },
    createElement(tagName: string) {
      if (tagName !== "script") {
        throw new Error(`Unexpected tag: ${tagName}`);
      }

      return createMockScript((script) => {
        if (script.id) {
          scriptsById.delete(script.id);
        }
      });
    },
    getElementById(id: string) {
      return scriptsById.get(id) ?? null;
    },
  } as unknown as Document;

  return {
    document,
    scripts,
    getLatestScript: () => scripts.at(-1),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadAmapSdk", () => {
  it("SSR 环境下不访问 window，直接返回 ssr_unavailable", async () => {
    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const result = await loadAmapSdk();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ssr_unavailable");
    }
  });

  it("缺少 NEXT_PUBLIC_AMAP_JS_KEY 时返回 missing_js_key", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", createMockDomHarness().document);

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const result = await loadAmapSdk();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("missing_js_key");
    }
  });

  it("window.AMap 已存在时直接复用，不插入 script", async () => {
    const harness = createMockDomHarness();
    const Map = vi.fn() as unknown as AMapMapConstructor;
    const amap = { Map } satisfies AMapGlobal;

    vi.stubGlobal("window", { AMap: amap, document: harness.document });
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const result = await loadAmapSdk();

    expect(result).toEqual({
      ok: true,
      status: "ready",
      amap,
      source: "window",
    });
    expect(harness.scripts).toHaveLength(0);
  });

  it("多次调用会复用同一个 Promise，不重复插入 script", async () => {
    const harness = createMockDomHarness();
    const mockWindow = { document: harness.document } as Window & typeof globalThis;

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const firstPromise = loadAmapSdk();
    const secondPromise = loadAmapSdk();

    expect(firstPromise).toBe(secondPromise);
    expect(harness.scripts).toHaveLength(1);

    mockWindow.AMap = {
      Map: vi.fn() as unknown as AMapMapConstructor,
    };
    harness.getLatestScript()?.dispatch("load");

    const result = await firstPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("script");
    }
  });

  it("script 加载失败时返回 script_load_failed", async () => {
    const harness = createMockDomHarness();
    const mockWindow = { document: harness.document } as Window & typeof globalThis;

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const promise = loadAmapSdk();

    harness.getLatestScript()?.dispatch("error");

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("script_load_failed");
    }
  });

  it("script onload 后 window.AMap 缺失时返回 amap_not_available", async () => {
    const harness = createMockDomHarness();
    const mockWindow = { document: harness.document } as Window & typeof globalThis;

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const promise = loadAmapSdk();

    harness.getLatestScript()?.dispatch("load");

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("amap_not_available");
    }
  });

  it("存在 securityJsCode 时会设置 window._AMapSecurityConfig", async () => {
    const harness = createMockDomHarness();
    const mockWindow = { document: harness.document } as Window & typeof globalThis;

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");
    vi.stubEnv("NEXT_PUBLIC_AMAP_SECURITY_JS_CODE", "security-code");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const promise = loadAmapSdk();

    expect(mockWindow._AMapSecurityConfig).toEqual({
      securityJsCode: "security-code",
    });

    mockWindow.AMap = {
      Map: vi.fn() as unknown as AMapMapConstructor,
    };
    harness.getLatestScript()?.dispatch("load");

    await expect(promise).resolves.toMatchObject({
      ok: true,
      status: "ready",
    });
  });

  it("生成的 script URL 只使用 NEXT_PUBLIC_AMAP_JS_KEY，不会回退到 AMAP_API_KEY", async () => {
    const harness = createMockDomHarness();
    const mockWindow = { document: harness.document } as Window & typeof globalThis;

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", harness.document);
    vi.stubEnv("NEXT_PUBLIC_AMAP_JS_KEY", "browser-key");
    vi.stubEnv("AMAP_API_KEY", "server-only-key");

    const { loadAmapSdk } = await import("../../lib/map/amap-loader");
    const promise = loadAmapSdk();
    const script = harness.getLatestScript();

    expect(script?.src).toContain("key=browser-key");
    expect(script?.src).not.toContain("server-only-key");

    mockWindow.AMap = {
      Map: vi.fn() as unknown as AMapMapConstructor,
    };
    script?.dispatch("load");

    await promise;
  });
});
