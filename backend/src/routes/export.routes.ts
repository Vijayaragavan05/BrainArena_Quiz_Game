import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  exportQuizCsv,
  exportQuizResultsCsv,
  exportQuizResultsXlsx,
  exportStudentReportPdf,
} from '../controllers/export.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/quiz/:quizId/questions/csv', exportQuizCsv);
router.get('/quiz/:quizId/results/csv', exportQuizResultsCsv);
router.get('/quiz/:quizId/results/xlsx', exportQuizResultsXlsx);
router.get('/student/:resultId/pdf', exportStudentReportPdf);

export default router;