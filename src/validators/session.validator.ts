import Joi from 'joi';

const startSessionSchema = Joi.object({
  stationId:        Joi.string().hex().length(24).required().messages({ 'any.required': 'stationId is required' }),
  chargerId:        Joi.string().required().messages({ 'any.required': 'chargerId is required' }),
  targetSocPercent: Joi.number().integer().min(1).max(100).default(80),
  startSocPercent:  Joi.number().integer().min(0).max(99).default(0),
  vehicleId:        Joi.string().hex().length(24),
});

const sessionHistorySchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'completed', 'cancelled'),
});

export { startSessionSchema, sessionHistorySchema };
