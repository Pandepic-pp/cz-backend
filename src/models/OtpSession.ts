import mongoose, { Schema, HydratedDocument } from 'mongoose';

export interface IOtpSession {
  phone: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date; // set by mongoose timestamps — used for resend cooldown
}

export type OtpSessionDocument = HydratedDocument<IOtpSession>;

const otpSessionSchema = new Schema<IOtpSession>(
  {
    phone:     { type: String, required: true, index: true },
    otp:       { type: String, required: true },
    // expires: 0 creates a TTL index — MongoDB auto-deletes when expiresAt is reached
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IOtpSession>('OtpSession', otpSessionSchema);
