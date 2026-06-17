import { Router } from 'express';
import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask
} from '../controllers/taskController.js';
import { validateTask } from '../middleware/validateTask.js';

const router = Router();

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', validateTask('create'), createTask);
router.put('/:id', validateTask('update'), updateTask);
router.patch('/:id', validateTask('update'), updateTask);
router.delete('/:id', deleteTask);

export default router;
