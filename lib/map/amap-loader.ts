import { getAmapClientEnv, type AmapClientEnv } from "./amap-env";
import type { AMapGlobal, AmapLoadResult } from "./amap-types";

const AMAP_SDK_SCRIPT_ID = "amap-js-sdk";
const AMAP_SDK_VERSION = "2.0";
const AMAP_SDK_BASE_URL = "https://webapi.amap.com/maps";
const SCRIPT_STATE_ATTRIBUTE = "amapLoaderState";

type BrowserWindow = Window & typeof globalThis;
type LoaderDocument = Pick<Document, "createElement" | "getElementById" | "head">;

interface LoadAmapSdkOptions {
  env?: AmapClientEnv;
  document?: LoaderDocument;
  window?: BrowserWindow;
}

let amapSdkPromise: Promise<AmapLoadResult> | null = null;
let hasLoggedEnvDiagnostics = false;

function createErrorResult(
  code: "ssr_unavailable" | "missing_js_key" | "script_load_failed" | "amap_not_available",
  message: string,
): AmapLoadResult {
  return {
    ok: false,
    status: "error",
    error: {
      code,
      message,
      status: "error",
    },
  };
}

function createSuccessResult(
  amap: AMapGlobal,
  source: "window" | "script",
): AmapLoadResult {
  return {
    ok: true,
    status: "ready",
    amap,
    source,
  };
}

function buildScriptUrl(jsKey: string): string {
  const url = new URL(AMAP_SDK_BASE_URL);
  url.searchParams.set("v", AMAP_SDK_VERSION);
  url.searchParams.set("key", jsKey);
  return url.toString();
}

function getBrowserWindow(
  providedWindow?: BrowserWindow,
): BrowserWindow | null {
  if (providedWindow) {
    return providedWindow;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

function getBrowserDocument(
  providedDocument: LoadAmapSdkOptions["document"],
  browserWindow: BrowserWindow,
): LoaderDocument | null {
  if (providedDocument) {
    return providedDocument;
  }

  if (!("document" in browserWindow) || !browserWindow.document) {
    return null;
  }

  return browserWindow.document;
}

function applySecurityConfig(
  browserWindow: BrowserWindow,
  securityJsCode: string | null,
) {
  if (!securityJsCode) {
    return;
  }

  browserWindow._AMapSecurityConfig = {
    securityJsCode,
  };
}

function logEnvDiagnostics(env: AmapClientEnv) {
  if (process.env.NODE_ENV === "production" || hasLoggedEnvDiagnostics) {
    return;
  }

  hasLoggedEnvDiagnostics = true;

  console.info("[amap-loader] env diagnostics", {
    hasJsKey: env.hasKey,
    keyLength: env.jsKey?.length ?? 0,
    hasSecurityJsCode: Boolean(env.securityJsCode),
  });
}

function getScriptState(script: HTMLScriptElement): string | undefined {
  return script.dataset[SCRIPT_STATE_ATTRIBUTE];
}

function setScriptState(script: HTMLScriptElement, state: string) {
  script.dataset[SCRIPT_STATE_ATTRIBUTE] = state;
}

function cleanupFailedScript(script: HTMLScriptElement) {
  setScriptState(script, "error");

  if (typeof script.remove === "function") {
    script.remove();
  }
}

function createScriptElement(
  documentRef: LoaderDocument,
  jsKey: string,
): HTMLScriptElement {
  const script = documentRef.createElement("script") as HTMLScriptElement;
  script.id = AMAP_SDK_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = buildScriptUrl(jsKey);
  setScriptState(script, "loading");
  return script;
}

function resolveWithWindowAmap(browserWindow: BrowserWindow): AmapLoadResult {
  if (browserWindow.AMap) {
    return createSuccessResult(browserWindow.AMap, "script");
  }

  return createErrorResult(
    "amap_not_available",
    "高德脚本已加载，但 window.AMap 仍不可用。",
  );
}

export function loadAmapSdk(
  options: LoadAmapSdkOptions = {},
): Promise<AmapLoadResult> {
  const browserWindow = getBrowserWindow(options.window);

  if (!browserWindow) {
    return Promise.resolve(
      createErrorResult(
        "ssr_unavailable",
        "高德地图 SDK 只能在浏览器环境中加载。",
      ),
    );
  }

  if (browserWindow.AMap) {
    return Promise.resolve(createSuccessResult(browserWindow.AMap, "window"));
  }

  const env = options.env ?? getAmapClientEnv();
  logEnvDiagnostics(env);

  if (!env.hasKey || !env.jsKey) {
    return Promise.resolve(
      createErrorResult(
        "missing_js_key",
        "缺少 NEXT_PUBLIC_AMAP_JS_KEY，暂时无法加载高德地图。",
      ),
    );
  }

  const documentRef = getBrowserDocument(options.document, browserWindow);
  if (!documentRef?.head) {
    return Promise.resolve(
      createErrorResult(
        "script_load_failed",
        "当前浏览器环境缺少可用的 document，暂时无法加载高德地图。",
      ),
    );
  }

  applySecurityConfig(browserWindow, env.securityJsCode);

  if (amapSdkPromise) {
    return amapSdkPromise;
  }

  let existingScript = documentRef.getElementById(
    AMAP_SDK_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (existingScript && getScriptState(existingScript) === "error") {
    cleanupFailedScript(existingScript);
    existingScript = null;
  }

  const script = existingScript ?? createScriptElement(documentRef, env.jsKey);

  if (!existingScript) {
    documentRef.head.appendChild(script);
  }

  amapSdkPromise = new Promise<AmapLoadResult>((resolve) => {
    const finalize = (result: AmapLoadResult) => {
      if (!result.ok) {
        amapSdkPromise = null;
      }

      resolve(result);
    };

    const handleLoad = () => {
      const result = resolveWithWindowAmap(browserWindow);

      if (result.ok) {
        setScriptState(script, "ready");
      } else {
        cleanupFailedScript(script);
      }

      finalize(result);
    };

    const handleError = () => {
      cleanupFailedScript(script);
      finalize(
        createErrorResult(
          "script_load_failed",
          "高德地图脚本加载失败，请稍后再试。",
        ),
      );
    };

    if (getScriptState(script) === "ready") {
      handleLoad();
      return;
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });

  return amapSdkPromise;
}
