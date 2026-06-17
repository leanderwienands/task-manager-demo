import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTaskRecord, PRIORITY_ORDER } from '../models/taskModel.js';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.join(path.dirname(currentFile), '..', '..');
const DEFAULT_TASKS_FILE = path.join(projectRoot, 'data', 'tasks.json');
const DATA_FILE = process.env.TASKS_FILE || DEFAULT_TASKS_FILE;
const SORT_DIRECTIONS = new Set(['asc', 'desc']);
const VALID_SORTS = new Set(['dueDate', 'priority']);
let cachedTasks;

/**
 * Returns tasks filtered and sorted by supported query parameters.
 */
export async function getTasks(query = {}) {
  const tasks = await loadTasks();
  const filteredTasks = applyFilters(tasks, query);
  return applySort(filteredTasks, query.sortBy, query.direction);
}

/**
 * Returns one task by id or raises a 404 error.
 */
export async function getTaskById(id) {
  const tasks = await loadTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) throw createHttpError(404, 'Task not found.', 'TASK_NOT_FOUND');
  return task;
}

/**
 * Creates and persists a new task.
 */
export async function createTask(payload) {
  const tasks = await loadTasks();
  const task = createTaskRecord(payload);
  tasks.push(task);
  await flushTasks(tasks);
  return task;
}

/**
 * Updates and persists an existing task.
 */
export async function updateTask(id, payload) {
  const tasks = await loadTasks();
  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex === -1) throw createHttpError(404, 'Task not found.', 'TASK_NOT_FOUND');
  tasks[taskIndex] = { ...tasks[taskIndex], ...payload, updatedAt: new Date().toISOString() };
  await flushTasks(tasks);
  return tasks[taskIndex];
}

/**
 * Deletes and persists an existing task.
 */
export async function deleteTask(id) {
  const tasks = await loadTasks();
  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex === -1) throw createHttpError(404, 'Task not found.', 'TASK_NOT_FOUND');
  tasks.splice(taskIndex, 1);
  await flushTasks(tasks);
}

/**
 * Replaces cached tasks for independent test setup.
 */
export async function replaceTasksForTest(tasks) {
  cachedTasks = tasks;
  await flushTasks(tasks);
}

async function loadTasks() {
  if (cachedTasks) return cachedTasks;
  try {
    cachedTasks = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    cachedTasks = [];
    await flushTasks(cachedTasks);
  }
  return cachedTasks;
}

async function flushTasks(tasks) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(tasks, null, 2)}\n`);
}

function applyFilters(tasks, query) {
  return tasks.filter((task) => matchesFilter(task, 'status', query.status)).filter((task) => {
    return matchesFilter(task, 'priority', query.priority);
  });
}

function matchesFilter(task, field, value) {
  return !value || task[field] === value;
}

function applySort(tasks, sortBy, direction = 'asc') {
  if (!VALID_SORTS.has(sortBy)) return tasks;
  const multiplier = SORT_DIRECTIONS.has(direction) && direction === 'desc' ? -1 : 1;
  return [...tasks].sort((first, second) => compareTasks(first, second, sortBy) * multiplier);
}

function compareTasks(first, second, sortBy) {
  if (sortBy === 'priority') return PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
  return new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime();
}

function createHttpError(status, message, code, field) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.field = field;
  return error;
}
