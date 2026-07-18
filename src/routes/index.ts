import { Router } from 'express';
import authRoutes    from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import stationRoutes from './station.routes.js';
import sessionRoutes from './session.routes.js';
import walletRoutes  from './wallet.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use('/auth',     authRoutes);
router.use('/profile',  profileRoutes);
router.use('/stations', stationRoutes);
router.use('/sessions', sessionRoutes);
router.use('/wallet',   walletRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
