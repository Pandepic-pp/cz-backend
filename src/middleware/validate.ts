import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ObjectSchema } from 'joi';
import { ParsedQs } from 'qs';
import ApiError from '../utils/ApiError.js';

const validate = (schema: ObjectSchema): RequestHandler => (req: Request, _res: Response, next: NextFunction): void => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const message = error.details.map((d) => d.message.replace(/['"]/g, '')).join(', ');
    return next(new ApiError(400, message));
  }
  req.body = value;
  next();
};

const validateQuery = (schema: ObjectSchema): RequestHandler => (req: Request, _res: Response, next: NextFunction): void => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) {
    const message = error.details.map((d) => d.message.replace(/['"]/g, '')).join(', ');
    return next(new ApiError(400, message));
  }
  req.query = value as ParsedQs;
  next();
};

export { validateQuery };
export default validate;
