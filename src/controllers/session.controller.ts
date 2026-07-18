import { Response } from 'express';
import { startSession, getSession, stopSession, getSessionHistory } from '../services/session.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { StartSessionBody } from '../services/session.service.js';

const start = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const session = await startSession(req.user._id, req.body as StartSessionBody);
  res.status(201).json(new ApiResponse(201, session, 'Charging session started'));
});

const getLive = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await getSession(req.user._id, req.params['id'] as string);
  res.json(new ApiResponse(200, data, 'Session data fetched'));
});

const stop = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await stopSession(req.user._id, req.params['id'] as string);
  res.json(new ApiResponse(200, result, 'Charging session stopped'));
});

const history = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { page, limit, status } = req.query as { page?: string; limit?: string; status?: string };
  const data = await getSessionHistory(req.user._id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status,
  });
  res.json(new ApiResponse(200, data, 'Session history fetched'));
});

export { start, getLive, stop, history };
