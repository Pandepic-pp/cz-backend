import { Router } from 'express';
import * as ctrl from '../controllers/profile.controller.js';
import { verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createProfileSchema, updateProfileSchema,
  vehicleSchema, updateVehicleSchema,
} from '../validators/profile.validator.js';

const router = Router();

router.use(verifyToken);

router.get('/',    ctrl.getProfile);
router.post('/',   validate(createProfileSchema), ctrl.createProfile);
router.put('/',    validate(updateProfileSchema),  ctrl.updateProfile);
router.delete('/', ctrl.deleteProfile);
router.get('/stats', ctrl.getStats);

router.get('/vehicles',              ctrl.getVehicles);
router.post('/vehicles',             validate(vehicleSchema),       ctrl.addVehicle);
router.put('/vehicles/:id',          validate(updateVehicleSchema), ctrl.updateVehicle);
router.delete('/vehicles/:id',       ctrl.deleteVehicle);
router.patch('/vehicles/:id/primary', ctrl.setPrimaryVehicle);

export default router;
