import { Request, Response } from 'express';
import { sendOtp, verifyOtp } from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

const sendOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  const data = await sendOtp(phone);
  res.json(new ApiResponse(200, data, 'OTP sent'));
});

const verifyOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body as { phone: string; otp: string };
  const { user, isNewUser, token } = await verifyOtp(phone, otp);

  const status = isNewUser ? 201 : 200;
  const message = isNewUser ? 'User registered' : 'Login successful';

  res.status(status).json(
    new ApiResponse(status, {
      token,
      userId: user._id,
      phone: user.phone,
      isNewUser,
      isProfileComplete: user.isProfileComplete,
    }, message)
  );
});

const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export { sendOtpHandler, verifyOtpHandler, logout };
