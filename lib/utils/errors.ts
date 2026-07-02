export const API_ERROR_CODES = [
  "INVALID_INPUT",
  "WEATHER_API_FAILED",
  "AI_GENERATION_FAILED",
  "AI_OUTPUT_INVALID",
  "UNKNOWN_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export function toApiErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }

  return {
    error: {
      code: "UNKNOWN_ERROR",
      message: "暂时无法处理这个请求，请稍后重试。",
    },
  };
}
