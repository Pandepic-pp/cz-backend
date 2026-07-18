import { Router } from 'express';
import { sendOtpHandler, verifyOtpHandler, logout } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { phoneSchema, verifyOtpSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/send-otp',   validate(phoneSchema),     sendOtpHandler);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtpHandler);
router.post('/logout',     verifyToken,               logout);

export default router;
