export type SupabaseConfigErrorCode =
  | "MISSING_SUPABASE_URL"
  | "MISSING_SUPABASE_ANON_KEY"
  | "MISSING_SUPABASE_SERVICE_ROLE_KEY";

export class SupabaseConfigError extends Error {
  readonly code: SupabaseConfigErrorCode;

  constructor(code: SupabaseConfigErrorCode, message: string) {
    super(message);
    this.name = "SupabaseConfigError";
    this.code = code;
  }
}
