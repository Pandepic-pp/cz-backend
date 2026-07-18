import Joi from 'joi';

const initiateTopUpSchema = Joi.object({
  amount: Joi.number().min(50).max(10000).required().messages({
    'any.required': 'amount is required',
    'number.min':   'Minimum top-up is ₹50',
    'number.max':   'Maximum top-up is ₹10,000',
  }),
});

const verifyTopUpSchema = Joi.object({
  razorpayOrderId:   Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
});

const transactionListSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export { initiateTopUpSchema, verifyTopUpSchema, transactionListSchema };
