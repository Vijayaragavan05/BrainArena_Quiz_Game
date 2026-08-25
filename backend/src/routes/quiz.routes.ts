import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listQuizzes,
  getQuizStats,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
  archiveQuiz,
  addQuestion,
  updateQuestion,
  removeQuestion,
  validateCreateQuiz,
  validateUpdateQuiz,
  validateCreateQuestion,
  validateUpdateQuestion,
} from '../controllers/quiz.controller.js';

const router = Router();

router.use(requireAuth, requireRole('teacher'));

router.get('/', listQuizzes);
router.get('/stats', getQuizStats);
router.get('/:id', getQuiz);
router.post('/', validateCreateQuiz, createQuiz);
router.put('/:id', validateUpdateQuiz, updateQuiz);
router.delete('/:id', deleteQuiz);
router.post('/:id/duplicate', duplicateQuiz);
router.patch('/:id/archive', archiveQuiz);
router.post('/:id/questions', validateCreateQuestion, addQuestion);
router.put('/:id/questions/:qid', validateUpdateQuestion, updateQuestion);
router.delete('/:id/questions/:qid', removeQuestion);

export default router;
