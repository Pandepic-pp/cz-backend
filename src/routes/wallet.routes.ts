import { Router } from 'express';
import { balance, initiateTopUpHandler, verifyTopUpHandler, transactions } from '../controllers/wallet.controller.js';
import { verifyToken } from '../middleware/auth.js';
import validate, { validateQuery } from '../middleware/validate.js';
import { initiateTopUpSchema, verifyTopUpSchema, transactionListSchema } from '../validators/wallet.validator.js';

const router = Router();

router.get('/',                verifyToken, balance);
router.post('/topup/initiate', verifyToken, validate(initiateTopUpSchema), initiateTopUpHandler);
router.post('/topup/verify',   verifyToken, validate(verifyTopUpSchema),   verifyTopUpHandler);
router.get('/transactions',    verifyToken, validateQuery(transactionListSchema), transactions);

export default router;
