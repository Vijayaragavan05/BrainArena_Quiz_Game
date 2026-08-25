import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  aiConfig,
  generateFromTopic,
  generateFromMaterial,
  regenerateQuestionEndpoint,
  extractMaterialText,
  MAX_MATERIAL_BYTES,
} from '../controllers/ai.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MATERIAL_BYTES } });

router.get('/config', aiConfig);
router.post('/questions', requireAuth, generateFromTopic);
router.post('/material', requireAuth, generateFromMaterial);
router.post('/regenerate', requireAuth, regenerateQuestionEndpoint);
router.post('/material/extract', requireAuth, upload.single('file'), extractMaterialText);

export default router;