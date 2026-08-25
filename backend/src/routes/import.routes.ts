import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { validateImport, applyImport, MAX_UPLOAD_BYTES } from '../controllers/import.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

router.use(requireAuth);

router.post('/validate', upload.single('file'), validateImport);
router.post('/apply', applyImport);

export default router;