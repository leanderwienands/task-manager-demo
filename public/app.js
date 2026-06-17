const API_URL = '/api/tasks';
const STATUS_COLUMNS = [
  { key: 'todo', label: 'Todo' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Done' }
];
const DEBOUNCE_MS = 300;

const state = { tasks: [], direction: 'asc' };
const elements = {
  form: document.querySelector('#task-form'),
  kanban: document.querySelector('#kanban'),
  status: document.querySelector('#status-message'),
  filterStatus: document.querySelector('#filter-status'),
  filterPriority: document.querySelector('#filter-priority'),
  sortBy: document.querySelector('#sort-by'),
  sortDirection: document.querySelector('#sort-direction')
};

const debouncedLoadTasks = debounce(loadTasks, DEBOUNCE_MS);

elements.form.addEventListener('submit', handleCreate);
elements.filterStatus.addEventListener('change', debouncedLoadTasks);
elements.filterPriority.addEventListener('change', debouncedLoadTasks);
elements.sortBy.addEventListener('change', debouncedLoadTasks);
elements.sortDirection.addEventListener('click', toggleSortDirection);

await loadTasks();

async function loadTasks() {
  try {
    const response = await fetch(`${API_URL}${buildQueryString()}`);
    const result = await parseResponse(response);
    state.tasks = result.data;
    renderBoard();
    setMessage('');
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleCreate(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(elements.form));
  payload.dueDate = new Date(payload.dueDate).toISOString();
  const created = await requestTask('', { method: 'POST', body: payload });
  if (!created) return;
  elements.form.reset();
  await loadTasks();
}

async function updateTask(id, body) {
  const updated = await requestTask(`/${id}`, { method: 'PATCH', body });
  if (!updated) return;
  await loadTasks();
}

async function deleteTask(id) {
  const deleted = await requestTask(`/${id}`, { method: 'DELETE' });
  if (!deleted) return;
  await loadTasks();
}

async function requestTask(path, options) {
  try {
    const result = await parseResponse(
      await fetch(`${API_URL}${path}`, {
        method: options.method,
        headers: { 'Content-Type': 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined
      })
    );
    return result;
  } catch (error) {
    setMessage(error.message);
    return null;
  }
}

async function parseResponse(response) {
  if (response.status === 204) return {};
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Request failed.');
  return result;
}

function renderBoard() {
  elements.kanban.replaceChildren(...STATUS_COLUMNS.map(createColumn));
}

function createColumn(column) {
  const tasks = state.tasks.filter((task) => task.status === column.key);
  const section = createElement('section', 'column');
  section.append(createColumnHeader(column.label, tasks.length), ...tasks.map(createTaskCard));
  return section;
}

function createColumnHeader(label, count) {
  const header = createElement('div', 'column-header');
  header.append(createElement('h2', '', label), createElement('span', 'count', String(count)));
  return header;
}

function createTaskCard(task) {
  const card = createElement('article', `task-card${isOverdue(task) ? ' overdue' : ''}`);
  card.append(createTitleButton(task), createElement('p', 'description', task.description));
  card.append(createMeta(task), createActions(task));
  return card;
}

function createTitleButton(task) {
  const button = createElement('button', 'task-title', task.title);
  button.addEventListener('click', () => replaceTitleWithInput(button, task));
  return button;
}

function createMeta(task) {
  const meta = createElement('div', 'meta');
  meta.append(createElement('span', `badge ${task.priority}`, task.priority), createDueDate(task));
  return meta;
}

function createDueDate(task) {
  return createElement('span', 'due', `Due ${new Date(task.dueDate).toLocaleDateString()}`);
}

function createActions(task) {
  const actions = createElement('div', 'actions');
  actions.append(createStatusSelect(task), createToggleButton(task), createDeleteButton(task));
  return actions;
}

function createStatusSelect(task) {
  const select = createElement('select');
  select.innerHTML = STATUS_COLUMNS.map(statusOption).join('');
  select.value = task.status;
  select.addEventListener('change', () => updateTask(task.id, { status: select.value }));
  return select;
}

function statusOption(column) {
  return `<option value="${column.key}">${column.label}</option>`;
}

function createToggleButton(task) {
  const isDone = task.status === 'done';
  const button = createElement('button', '', isDone ? 'Reopen' : 'Complete');
  button.addEventListener('click', () => updateTask(task.id, { status: isDone ? 'todo' : 'done' }));
  return button;
}

function createDeleteButton(task) {
  const button = createElement('button', 'delete', 'Delete');
  button.addEventListener('click', () => deleteTask(task.id));
  return button;
}

function replaceTitleWithInput(button, task) {
  const input = createTitleInput(task);
  button.replaceWith(input);
  input.focus();
  input.select();
}

function createTitleInput(task) {
  const input = createElement('input', 'title-edit');
  input.value = task.title;
  input.addEventListener('keydown', (event) => handleTitleKeydown(event, task));
  input.addEventListener('blur', () => saveTitle(input.value, task));
  return input;
}

function handleTitleKeydown(event, task) {
  if (event.key === 'Enter') saveTitle(event.currentTarget.value, task);
  if (event.key === 'Escape') renderBoard();
}

function saveTitle(value, task) {
  const title = value.trim();
  if (!title || title === task.title) {
    renderBoard();
    return;
  }
  updateTask(task.id, { title });
}

function buildQueryString() {
  const parameters = new URLSearchParams();
  appendParameter(parameters, 'status', elements.filterStatus.value);
  appendParameter(parameters, 'priority', elements.filterPriority.value);
  appendParameter(parameters, 'sortBy', elements.sortBy.value);
  appendParameter(parameters, 'direction', state.direction);
  return parameters.toString() ? `?${parameters}` : '';
}

function appendParameter(parameters, key, value) {
  if (value) parameters.set(key, value);
}

function toggleSortDirection() {
  state.direction = state.direction === 'asc' ? 'desc' : 'asc';
  elements.sortDirection.textContent = state.direction === 'asc' ? 'Asc' : 'Desc';
  debouncedLoadTasks();
}

function isOverdue(task) {
  return task.status !== 'done' && new Date(task.dueDate).getTime() < Date.now();
}

function setMessage(message) {
  elements.status.textContent = message;
}

function createElement(tagName, className = '', text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function debounce(callback, delay) {
  let timerId;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}
