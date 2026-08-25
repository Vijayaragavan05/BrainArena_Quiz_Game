import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  startSession,
  lookupSession,
  validateCreateSession,
} from '../controllers/session.controller.js';

const router = Router();

router.post('/', requireAuth, requireRole('teacher'), validateCreateSession, startSession);
router.get('/lookup/:pin', requireAuth, lookupSession);

export default router;