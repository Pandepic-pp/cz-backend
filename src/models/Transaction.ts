import mongoose, { Schema, Types, HydratedDocument } from 'mongoose';

export interface ITransaction {
  userId: Types.ObjectId;
  sessionId?: Types.ObjectId;
  type: 'debit' | 'credit' | 'refund';
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export type TransactionDocument = HydratedDocument<ITransaction>;

const transactionSchema = new Schema<ITransaction>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId:     { type: Schema.Types.ObjectId, ref: 'ChargingSession' },
    type:          { type: String, enum: ['debit', 'credit', 'refund'], required: true },
    amount:        { type: Number, required: true, min: 0 },
    description:   { type: String, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },
    status:        { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    metadata:      { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
