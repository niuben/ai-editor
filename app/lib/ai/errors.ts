export class AIProviderError extends Error {
  constructor(
    public code:
      | "RATE_LIMITED"
      | "TIMEOUT"
      | "EMPTY_RESPONSE"
      | "INVALID_JSON"
      | "SCHEMA_VALIDATION_FAILED"
      | "UNKNOWN",
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
