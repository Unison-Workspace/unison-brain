export class BrainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "BrainError";
    this.code = code;
    this.status = status;
  }
}

export class AuthError extends BrainError {
  constructor(message = "Not authenticated") {
    super("unauthenticated", message, 401);
    this.name = "AuthError";
  }
}
