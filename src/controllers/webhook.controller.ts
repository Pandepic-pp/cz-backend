import { Request, Response } from 'express';
import crypto from 'crypto';
import { creditWalletFromWebhook } from '../services/wallet.service.js';
import asyncHandler from '../utils/asyncHandler.js';

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
      };
    };
  };
}

const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (!signature) {
    res.status(400).json({ success: false, message: 'Missing signature' });
    return;
  }

  // req.body is a Buffer here (express.raw middleware applied upstream in app.ts)
  const body = req.body as Buffer;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (expectedSig !== signature) {
    res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    return;
  }

  const event = JSON.parse(body.toString()) as RazorpayWebhookEvent;

  if (event.event === 'payment.captured') {
    const { id: razorpayPaymentId, order_id: razorpayOrderId } = event.payload.payment.entity;
    await creditWalletFromWebhook(razorpayOrderId, razorpayPaymentId);
  }

  res.json({ success: true });
});

export { razorpayWebhook };
