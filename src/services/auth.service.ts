import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import OtpSession from '../models/OtpSession.js';
import OtpAttempt from '../models/OtpAttempt.js';
import User, { UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const OTP_EXPIRY_MS       = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_SEC = 30;
const MAX_ACTIVE_SESSIONS = 3;
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS   = 15 * 60 * 1000;

export interface SendOtpResult {
  expiresAt: Date;
}

export interface VerifyOtpResult {
  user: UserDocument;
  isNewUser: boolean;
  token: string;
}

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91${digits.slice(2)}`;
  if (digits.length === 10) return `+91${digits}`;
  throw new ApiError(400, 'Invalid phone number');
};

const assertNotBlocked = async (phone: string): Promise<void> => {
  const attempt = await OtpAttempt.findOne({ phone });
  if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) {
    const secsLeft = Math.ceil((attempt.blockedUntil.getTime() - Date.now()) / 1000);
    throw new ApiError(429, `Too many failed attempts. Try again in ${secsLeft} seconds.`);
  }
};

const sendOtp = async (phone: string): Promise<SendOtpResult> => {
  const normalizedPhone = normalizePhone(phone);

  await assertNotBlocked(normalizedPhone);

  const latest = await OtpSession.findOne({ phone: normalizedPhone }).sort({ createdAt: -1 });
  if (latest) {
    const secondsSince = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (secondsSince < RESEND_COOLDOWN_SEC) {
      const waitSecs = Math.ceil(RESEND_COOLDOWN_SEC - secondsSince);
      throw new ApiError(429, `Please wait ${waitSecs} seconds before requesting another OTP.`);
    }
  }

  const count = await OtpSession.countDocuments({ phone: normalizedPhone });
  if (count >= MAX_ACTIVE_SESSIONS) {
    const toDelete = count - MAX_ACTIVE_SESSIONS + 1;
    const oldest = await OtpSession.find({ phone: normalizedPhone })
      .sort({ createdAt: 1 })
      .limit(toDelete);
    await OtpSession.deleteMany({ _id: { $in: oldest.map((s) => s._id) } });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await OtpSession.create({ phone: normalizedPhone, otp, expiresAt });

  const phone10 = normalizedPhone.slice(3);
  const url = `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/${phone10}/${otp}/ArchWyse`;
  const res = await fetch(url);
  const data = await res.json() as { Status: string; Details: string };

  if (data.Status !== 'Success') {
    throw new ApiError(502, `OTP send failed: ${data.Details}`);
  }

  return { expiresAt };
};

const verifyOtp = async (phone: string, otp: string): Promise<VerifyOtpResult> => {
  const normalizedPhone = normalizePhone(phone);

  await assertNotBlocked(normalizedPhone);

  const sessions = await OtpSession.find({
    phone: normalizedPhone,
    expiresAt: { $gt: new Date() },
  });

  if (sessions.length === 0) {
    throw new ApiError(400, 'OTP expired or not found. Please request a new one.');
  }

  const matched = sessions.find((s) => s.otp === otp);

  if (!matched) {
    const attempt = await OtpAttempt.findOneAndUpdate(
      { phone: normalizedPhone },
      { $inc: { failedAttempts: 1 } },
      { upsert: true, new: true }
    );

    const remaining = MAX_FAILED_ATTEMPTS - (attempt?.failedAttempts ?? 1);

    if (remaining <= 0) {
      const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
      await OtpAttempt.findOneAndUpdate({ phone: normalizedPhone }, { blockedUntil });
      await OtpSession.deleteMany({ phone: normalizedPhone });
      throw new ApiError(429, 'Too many failed attempts. Phone blocked for 15 minutes.');
    }

    throw new ApiError(401, `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
  }

  await OtpSession.deleteMany({ phone: normalizedPhone });
  await OtpAttempt.findOneAndUpdate(
    { phone: normalizedPhone },
    { failedAttempts: 0, blockedUntil: null },
    { upsert: true }
  );

  let user = await User.findOne({ phone: normalizedPhone });
  const isNewUser = !user;

  if (isNewUser) {
    user = await User.create({ phone: normalizedPhone, lastLoginAt: new Date() });
  } else {
    user!.lastLoginAt = new Date();
    await user!.save();
  }

  const token = jwt.sign(
    { userId: user!._id.toString() },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'] }
  );

  return { user: user!, isNewUser, token };
};

export { sendOtp, verifyOtp };
