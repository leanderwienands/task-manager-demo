const DEFAULT_STATUS = 500;
const DEFAULT_CODE = 'INTERNAL_SERVER_ERROR';

/**
 * Sends structured JSON errors for all API failures.
 */
export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = error.status || DEFAULT_STATUS;
  const body = createErrorBody(error, status);
  response.status(status).json(body);
}

function createErrorBody(error, status) {
  const responseError = {
    message: error.message || 'Unexpected server error.',
    code: error.code || DEFAULT_CODE
  };
  if (error.field) responseError.field = error.field;
  if (error.details) responseError.details = error.details;
  if (process.env.NODE_ENV !== 'production' && status === DEFAULT_STATUS) {
    responseError.stack = error.stack;
  }
  return { error: responseError };
}
