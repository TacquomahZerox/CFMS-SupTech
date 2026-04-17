export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export class AuthenticationError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class IllegalStateTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super(
      `Illegal ${entity} state transition from ${from} to ${to}`,
      'ILLEGAL_STATE_TRANSITION',
      409,
      { from, to }
    );
  }
}

export class RateLimitError extends DomainError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMITED', 429);
  }
}
