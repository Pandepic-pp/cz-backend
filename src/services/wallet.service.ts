import crypto from 'crypto';
import { Types } from 'mongoose';
import razorpay from '../config/razorpay.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import RazorpayOrder from '../models/RazorpayOrder.js';
import ApiError from '../utils/ApiError.js';

export interface WalletResult {
  balance: number;
  recentTransactions: unknown[];
}

export interface InitiateTopUpResult {
  orderId: string;
  amount: number;     // paise — what Razorpay SDK/checkout expects
  amountRs: number;   // rupees — for display
  currency: string;
  keyId: string;
}

export interface VerifyTopUpBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface TopUpResult {
  balance: number;
  transaction?: unknown;
  alreadyProcessed?: boolean;
}

const getWallet = async (userId: Types.ObjectId): Promise<WalletResult> => {
  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, 'User not found');

  const recentTransactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return { balance: user.walletBalance, recentTransactions };
};

const initiateTopUp = async (userId: Types.ObjectId, amount: number): Promise<InitiateTopUpResult> => {
  if (amount < 50 || amount > 10000) {
    throw new ApiError(400, 'Top-up amount must be between ₹50 and ₹10,000');
  }

  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, 'User not found');

  const amountPaise = Math.round(amount * 100);
  const receipt = `wallet_${userId}_${Date.now()}`;

  const order = await razorpay.orders.create({ amount: amountPaise, currency: 'INR', receipt });

  await RazorpayOrder.create({
    razorpayOrderId: order.id,
    userId,
    amount,
    amountPaise,
    receipt,
  });

  return {
    orderId: order.id,
    amount: amountPaise,
    amountRs: amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
};

const verifyTopUp = async (userId: Types.ObjectId, body: VerifyTopUpBody): Promise<TopUpResult> => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== razorpaySignature) {
    throw new ApiError(400, 'Payment verification failed: invalid signature');
  }

  return _creditWallet(razorpayOrderId, razorpayPaymentId, userId);
};

// Called by the Razorpay webhook as a fallback safety net
const creditWalletFromWebhook = async (razorpayOrderId: string, razorpayPaymentId: string): Promise<TopUpResult> =>
  _creditWallet(razorpayOrderId, razorpayPaymentId, null);

// Idempotent — status='paid' prevents double-credit if both verify and webhook fire
const _creditWallet = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  callerUserId: Types.ObjectId | null
): Promise<TopUpResult> => {
  const order = await RazorpayOrder.findOne({ razorpayOrderId });
  if (!order) throw new ApiError(404, 'Order not found');

  if (callerUserId && order.userId.toString() !== callerUserId.toString()) {
    throw new ApiError(403, 'Order does not belong to this user');
  }

  if (order.status === 'paid') {
    const user = await User.findById(order.userId).lean();
    return { balance: user?.walletBalance ?? 0, alreadyProcessed: true };
  }

  const user = await User.findById(order.userId);
  if (!user) throw new ApiError(404, 'User not found');

  const balanceBefore = user.walletBalance;
  user.walletBalance = parseFloat((balanceBefore + order.amount).toFixed(2));
  await user.save();

  order.status = 'paid';
  order.razorpayPaymentId = razorpayPaymentId;
  await order.save();

  const transaction = await Transaction.create({
    userId: order.userId,
    type: 'credit',
    amount: order.amount,
    description: 'Wallet top-up via Razorpay',
    balanceBefore,
    balanceAfter: user.walletBalance,
    status: 'completed',
    metadata: { razorpayOrderId, razorpayPaymentId },
  });

  return { balance: user.walletBalance, transaction };
};

export interface TransactionListResult {
  transactions: unknown[];
  total: number;
  page: number;
  totalPages: number;
}

const getTransactions = async (userId: Types.ObjectId, { page = 1, limit = 20 } = {}): Promise<TransactionListResult> => {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments({ userId }),
  ]);
  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
};

export { getWallet, initiateTopUp, verifyTopUp, creditWalletFromWebhook, getTransactions };
