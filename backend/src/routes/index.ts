import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from './auth.routes.js';
import quizRouter from './quiz.routes.js';
import sessionRouter from './session.routes.js';
import resultsRouter from './results.routes.js';
import importRouter from './import.routes.js';
import bankRouter from './bank.routes.js';
import aiRouter from './ai.routes.js';
import exportRouter from './export.routes.js';
import adminRouter from './admin.routes.js';

const router = Router();

router.use('/api', healthRouter);
router.use('/api/auth', authRouter);
router.use('/api/quizzes', quizRouter);
router.use('/api/sessions', sessionRouter);
router.use('/api/results', resultsRouter);
router.use('/api/import', importRouter);
router.use('/api/bank', bankRouter);
router.use('/api/ai', aiRouter);
router.use('/api/export', exportRouter);
router.use('/api/admin', adminRouter);

export default router;