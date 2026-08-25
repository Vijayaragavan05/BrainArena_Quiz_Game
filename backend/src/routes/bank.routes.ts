import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listBank,
  getBankTopics,
  addToBank,
  removeFromBank,
  addBankQuestionToQuiz,
  addBankToQuiz,
} from '../controllers/bank.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listBank);
router.get('/topics', getBankTopics);
router.post('/questions', addToBank);
router.delete('/questions/:id', removeFromBank);
router.post('/questions/:id/add-to-quiz/:quizId', addBankQuestionToQuiz);
router.post('/add-to-quiz/:quizId', addBankToQuiz);

export default router;