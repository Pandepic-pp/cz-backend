import { Request } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User, { UserDocument } from '../models/User.js';

// Use this type in authenticated controllers for non-optional req.user
export interface AuthRequest extends Request {
  user: UserDocument;
}

const verifyToken = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization header missing or malformed');
  }

  const token = authHeader.split('Bearer ')[1];
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findOne({ _id: decoded.userId, isActive: true });
  if (!user) throw new ApiError(401, 'User not found');

  req.user = user;
  next();
});

export { verifyToken };
