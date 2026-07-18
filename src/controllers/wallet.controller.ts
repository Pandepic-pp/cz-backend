import { Response } from 'express';
import { getWallet, initiateTopUp, verifyTopUp, getTransactions } from '../services/wallet.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { VerifyTopUpBody } from '../services/wallet.service.js';

const balance = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await getWallet(req.user._id);
  res.json(new ApiResponse(200, data, 'Wallet fetched'));
});

const initiateTopUpHandler = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { amount } = req.body as { amount: number };
  const data = await initiateTopUp(req.user._id, amount);
  res.json(new ApiResponse(200, data, 'Order created — proceed to payment'));
});

const verifyTopUpHandler = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await verifyTopUp(req.user._id, req.body as VerifyTopUpBody);
  res.json(new ApiResponse(200, data, 'Payment verified — wallet credited'));
});

const transactions = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { page, limit } = req.query as { page?: string; limit?: string };
  const data = await getTransactions(req.user._id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json(new ApiResponse(200, data, 'Transactions fetched'));
});

export { balance, initiateTopUpHandler, verifyTopUpHandler, transactions };
