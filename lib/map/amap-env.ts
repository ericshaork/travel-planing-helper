export interface AmapClientEnv {
  jsKey: string | null;
  securityJsCode: string | null;
  hasKey: boolean;
}

function normalizeEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getAmapClientEnv(
  source?: Readonly<Record<string, string | undefined>>,
): AmapClientEnv {
  const jsKey = source
    ? normalizeEnvValue(source.NEXT_PUBLIC_AMAP_JS_KEY)
    : normalizeEnvValue(process.env.NEXT_PUBLIC_AMAP_JS_KEY);
  const securityJsCode = source
    ? normalizeEnvValue(source.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE)
    : normalizeEnvValue(process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE);

  return {
    jsKey,
    securityJsCode,
    hasKey: jsKey !== null,
  };
}

export function hasAmapClientKey(
  source?: Readonly<Record<string, string | undefined>>,
): boolean {
  return getAmapClientEnv(source).hasKey;
}
