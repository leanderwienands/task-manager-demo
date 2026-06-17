import * as taskService from '../services/taskService.js';

/**
 * Sends all tasks matching query filters.
 */
export async function getTasks(request, response, next) {
  try {
    const tasks = await taskService.getTasks(request.query);
    response.status(200).json({ data: tasks });
  } catch (error) {
    next(error);
  }
}

/**
 * Sends a single task by id.
 */
export async function getTask(request, response, next) {
  try {
    const task = await taskService.getTaskById(request.params.id);
    response.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a task from a validated request body.
 */
export async function createTask(request, response, next) {
  try {
    const task = await taskService.createTask(request.body);
    response.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a task from a validated request body.
 */
export async function updateTask(request, response, next) {
  try {
    const task = await taskService.updateTask(request.params.id, request.body);
    response.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a task by id.
 */
export async function deleteTask(request, response, next) {
  try {
    await taskService.deleteTask(request.params.id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
