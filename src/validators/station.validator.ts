import Joi from 'joi';

const nearbySchema = Joi.object({
  lat:       Joi.number().min(-90).max(90).required().messages({ 'any.required': 'lat is required' }),
  lng:       Joi.number().min(-180).max(180).required().messages({ 'any.required': 'lng is required' }),
  radius:    Joi.number().min(100).max(50000).default(5000),
  connector: Joi.string().valid('CCS2', 'CHAdeMO', 'Type2', 'GBT'),
  type:      Joi.string().valid('AC Slow', 'DC Fast', 'Ultra Fast'),
});

export { nearbySchema };
