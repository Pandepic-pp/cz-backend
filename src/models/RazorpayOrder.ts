import mongoose, { Schema, Types, HydratedDocument } from 'mongoose';

export interface IRazorpayOrder {
  razorpayOrderId: string;
  userId: Types.ObjectId;
  amount: number;      // rupees
  amountPaise: number; // paise (amount × 100)
  currency: string;
  status: 'created' | 'paid' | 'failed';
  razorpayPaymentId?: string;
  receipt?: string;
}

export type RazorpayOrderDocument = HydratedDocument<IRazorpayOrder>;

const razorpayOrderSchema = new Schema<IRazorpayOrder>(
  {
    razorpayOrderId:  { type: String, required: true, unique: true },
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount:           { type: Number, required: true },
    amountPaise:      { type: Number, required: true },
    currency:         { type: String, default: 'INR' },
    status:           { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    razorpayPaymentId: { type: String },
    receipt:          { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IRazorpayOrder>('RazorpayOrder', razorpayOrderSchema);
