import { Router } from 'express';
import { razorpayWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// express.raw() is applied in app.ts before express.json() — req.body is a Buffer here
router.post('/razorpay', razorpayWebhook);

export default router;
