export const DEVELOPMENT_GUEST_PROJECT_HEADER = "x-wanderly-dev-guest";

export function isDevelopmentGuestProjectBypassEnabled(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (source.NODE_ENV !== "development") {
    return false;
  }

  const explicitSetting =
    source.WANDERLY_ENABLE_DEV_GUEST_PROJECTS ??
    source.NEXT_PUBLIC_WANDERLY_ENABLE_DEV_GUEST_PROJECTS;

  return explicitSetting !== "false";
}

export function shouldSendDevelopmentGuestProjectHeader(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  return isDevelopmentGuestProjectBypassEnabled(source);
}
