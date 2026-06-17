import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';

const initialTasks = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Seed task',
    description: 'A task used by tests.',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  }
];

let app;
let taskService;

beforeAll(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'task-manager-test-'));
  process.env.TASKS_FILE = path.join(directory, 'tasks.json');
  app = (await import('../src/server.js')).default;
  taskService = await import('../src/services/taskService.js');
});

beforeEach(async () => {
  await taskService.replaceTasksForTest(structuredClone(initialTasks));
});

test('GET /api/tasks returns tasks', async () => {
  const response = await request(app).get('/api/tasks').expect(200);
  expect(response.body.data).toHaveLength(1);
});

test('GET /api/tasks filters and sorts tasks', async () => {
  await taskService.createTask(createPayload({ priority: 'high' }));
  const response = await request(app).get('/api/tasks?priority=high&sortBy=priority').expect(200);
  expect(response.body.data[0].priority).toBe('high');
});

test('GET /api/tasks/:id returns a task', async () => {
  const response = await request(app).get(`/api/tasks/${initialTasks[0].id}`).expect(200);
  expect(response.body.data.title).toBe('Seed task');
});

test('GET /api/tasks/:id returns 404 for missing task', async () => {
  const response = await request(app).get('/api/tasks/missing').expect(404);
  expect(response.body.error.code).toBe('TASK_NOT_FOUND');
});

test('POST /api/tasks creates a task', async () => {
  const response = await request(app).post('/api/tasks').send(createPayload()).expect(201);
  expect(response.body.data.id).toBeDefined();
});

test('POST /api/tasks rejects invalid input', async () => {
  const response = await request(app).post('/api/tasks').send({ title: '' }).expect(422);
  expect(response.body.error.details.length).toBeGreaterThan(0);
});

test('PATCH /api/tasks/:id updates a task', async () => {
  const response = await request(app)
    .patch(`/api/tasks/${initialTasks[0].id}`)
    .send({ status: 'done' })
    .expect(200);
  expect(response.body.data.status).toBe('done');
});

test('PATCH /api/tasks/:id rejects unknown fields', async () => {
  const response = await request(app)
    .patch(`/api/tasks/${initialTasks[0].id}`)
    .send({ id: 'client-id' })
    .expect(422);
  expect(response.body.error.code).toBe('TASK_VALIDATION_FAILED');
});

test('DELETE /api/tasks/:id deletes a task', async () => {
  await request(app).delete(`/api/tasks/${initialTasks[0].id}`).expect(204);
  await request(app).get(`/api/tasks/${initialTasks[0].id}`).expect(404);
});

test('DELETE /api/tasks/:id returns 404 for missing task', async () => {
  const response = await request(app).delete('/api/tasks/missing').expect(404);
  expect(response.body.error.code).toBe('TASK_NOT_FOUND');
});

function createPayload(overrides = {}) {
  return {
    title: 'Write tests',
    description: 'Cover the task API.',
    status: 'todo',
    priority: 'low',
    dueDate: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}
