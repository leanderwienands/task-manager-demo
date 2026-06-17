import { v4 as uuidv4 } from 'uuid';

export const TASK_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];
export const STATUS_VALUES = ['todo', 'in-progress', 'done'];
export const PRIORITY_VALUES = ['low', 'medium', 'high'];
export const PRIORITY_ORDER = { low: 1, medium: 2, high: 3 };
const TAG_PATTERN = /<[^>]*>/g;

/**
 * Creates a complete task record with server-owned fields.
 */
export function createTaskRecord(payload) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    dueDate: payload.dueDate,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Sanitizes task input by stripping HTML tags from string values.
 */
export function sanitizeTaskPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, sanitizeValue(value)])
  );
}

/**
 * Validates task input and returns field-level errors.
 */
export function validateTaskPayload(payload, mode) {
  const errors = [];
  validateUnknownFields(payload, errors);
  validateRequiredFields(payload, mode, errors);
  validateKnownFields(payload, errors);
  return errors;
}

function sanitizeValue(value) {
  return typeof value === 'string' ? value.replace(TAG_PATTERN, '').trim() : value;
}

function validateUnknownFields(payload, errors) {
  Object.keys(payload).forEach((field) => {
    if (!TASK_FIELDS.includes(field)) addError(errors, field, 'Unknown field.');
  });
}

function validateRequiredFields(payload, mode, errors) {
  if (mode !== 'create') return;
  TASK_FIELDS.forEach((field) => {
    if (payload[field] === undefined) addError(errors, field, 'Field is required.');
  });
}

function validateKnownFields(payload, errors) {
  validateTextField(payload, 'title', errors);
  validateTextField(payload, 'description', errors);
  validateEnumField(payload, 'status', STATUS_VALUES, errors);
  validateEnumField(payload, 'priority', PRIORITY_VALUES, errors);
  validateDueDate(payload, errors);
}

function validateTextField(payload, field, errors) {
  if (payload[field] === undefined) return;
  if (typeof payload[field] !== 'string' || payload[field].length === 0) {
    addError(errors, field, 'Must be a non-empty string.');
  }
}

function validateEnumField(payload, field, values, errors) {
  if (payload[field] === undefined) return;
  if (!values.includes(payload[field])) addError(errors, field, `Must be one of: ${values.join(', ')}.`);
}

function validateDueDate(payload, errors) {
  if (payload.dueDate === undefined) return;
  if (Number.isNaN(Date.parse(payload.dueDate))) addError(errors, 'dueDate', 'Must be ISO 8601.');
}

function addError(errors, field, message) {
  errors.push({ field, message });
}
