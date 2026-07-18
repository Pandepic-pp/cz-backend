import { Router } from 'express';
import { start, getLive, stop, history } from '../controllers/session.controller.js';
import { verifyToken } from '../middleware/auth.js';
import validate, { validateQuery } from '../middleware/validate.js';
import { startSessionSchema, sessionHistorySchema } from '../validators/session.validator.js';

const router = Router();

router.post('/start',     verifyToken, validate(startSessionSchema),      start);
router.get('/',           verifyToken, validateQuery(sessionHistorySchema), history);
router.get('/:id',        verifyToken, getLive);
router.patch('/:id/stop', verifyToken, stop);

export default router;
