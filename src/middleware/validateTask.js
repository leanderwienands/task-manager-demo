import { sanitizeTaskPayload, validateTaskPayload } from '../models/taskModel.js';

/**
 * Validates and sanitizes task payloads before controller execution.
 */
export function validateTask(mode) {
  return (request, response, next) => {
    try {
      request.body = sanitizeTaskPayload(request.body || {});
      const errors = validateTaskPayload(request.body, mode);
      if (errors.length > 0) throw createValidationError(errors);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function createValidationError(details) {
  const error = new Error('Task validation failed.');
  error.status = 422;
  error.code = 'TASK_VALIDATION_FAILED';
  error.details = details;
  return error;
}
