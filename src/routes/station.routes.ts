import { Router } from 'express';
import { nearby, getById } from '../controllers/station.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { nearbySchema } from '../validators/station.validator.js';

const router = Router();

router.get('/nearby', verifyToken, validateQuery(nearbySchema), nearby);
router.get('/:id',    verifyToken, getById);

export default router;
