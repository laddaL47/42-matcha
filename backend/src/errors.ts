export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(code, 400, message, details);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'Unauthorized') =>
  new AppError(code, 401, message);
export const forbidden = (code = 'FORBIDDEN', message = 'Forbidden') =>
  new AppError(code, 403, message);
export const notFound = (code = 'NOT_FOUND', message = 'Not Found') =>
  new AppError(code, 404, message);
export const conflict = (code = 'CONFLICT', message = 'Conflict') =>
  new AppError(code, 409, message);
export const internal = (message = 'Internal Server Error', details?: unknown) =>
  new AppError('INTERNAL_ERROR', 500, message, details);
