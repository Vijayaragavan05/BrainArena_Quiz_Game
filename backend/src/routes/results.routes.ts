import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listMyResults,
  getMyResult,
  listQuizResults,
  getQuizOverview,
} from '../controllers/results.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/student/me', listMyResults);
router.get('/student/:resultId', getMyResult);
router.get('/quiz/:quizId', requireRole('teacher'), listQuizResults);
router.get('/quiz/:quizId/overview', requireRole('teacher'), getQuizOverview);

export default router;