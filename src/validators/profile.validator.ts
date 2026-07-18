import Joi from 'joi';

const vehicleShape = {
  brand:       Joi.string().trim().min(1).max(60),
  model:       Joi.string().trim().min(1).max(100),
  type:        Joi.string().valid('BEV', 'PHEV', 'HYBRID'),
  batteryKWh:  Joi.number().positive().max(200).optional(),
  rangeKm:     Joi.number().positive().max(2000).optional(),
  connector:   Joi.string().valid('CCS2', 'CHAdeMO', 'Type2', 'GBT', 'CCS1').optional(),
  plateNumber: Joi.string().trim().uppercase().max(15).optional().allow(''),
  isPrimary:   Joi.boolean().optional(),
};

const createProfileSchema = Joi.object({
  name:               Joi.string().trim().min(2).max(100).required(),
  email:              Joi.string().email().optional().allow(''),
  dob:                Joi.date().iso().max('now').optional(),
  gender:             Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  city:               Joi.string().trim().min(2).max(100).optional().allow(''),
  preferredConnector: Joi.string().valid('CCS2', 'CHAdeMO', 'Type2', 'GBT').optional(),
  preferredSpeed:     Joi.string().valid('AC', 'DC Fast', 'Ultra Fast').optional(),
  vehicle: Joi.object({
    ...vehicleShape,
    brand: vehicleShape.brand!.required(),
    model: vehicleShape.model!.required(),
    type:  vehicleShape.type!.required(),
  }).optional(),
});

const updateProfileSchema = Joi.object({
  name:               Joi.string().trim().min(2).max(100).optional(),
  email:              Joi.string().email().optional().allow(''),
  dob:                Joi.date().iso().max('now').optional(),
  gender:             Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  city:               Joi.string().trim().min(2).max(100).optional().allow(''),
  preferredConnector: Joi.string().valid('CCS2', 'CHAdeMO', 'Type2', 'GBT').optional(),
  preferredSpeed:     Joi.string().valid('AC', 'DC Fast', 'Ultra Fast').optional(),
}).min(1);

const vehicleSchema = Joi.object({
  ...vehicleShape,
  brand: vehicleShape.brand!.required(),
  model: vehicleShape.model!.required(),
  type:  vehicleShape.type!.required(),
});

const updateVehicleSchema = Joi.object(vehicleShape).min(1);

export { createProfileSchema, updateProfileSchema, vehicleSchema, updateVehicleSchema };
