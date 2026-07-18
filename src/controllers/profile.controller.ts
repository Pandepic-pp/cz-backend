import { Response } from 'express';
import * as service from '../services/profile.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AuthRequest } from '../middleware/auth.js';

const getProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.getProfile(req.user._id);
  res.json(new ApiResponse(200, data));
});

const createProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.createProfile(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, data, 'Profile created'));
});

const updateProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.updateProfile(req.user._id, req.body);
  res.json(new ApiResponse(200, data, 'Profile updated'));
});

const deleteProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
  await service.deleteProfile(req.user._id);
  res.json(new ApiResponse(200, null, 'Account deleted'));
});

const getStats = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.getStats(req.user._id);
  res.json(new ApiResponse(200, data));
});

const getVehicles = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.getVehicles(req.user._id);
  res.json(new ApiResponse(200, data));
});

const addVehicle = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.addVehicle(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, data, 'Vehicle added'));
});

const updateVehicle = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.updateVehicle(req.user._id, req.params['id'] as string, req.body);
  res.json(new ApiResponse(200, data, 'Vehicle updated'));
});

const deleteVehicle = asyncHandler<AuthRequest>(async (req, res: Response) => {
  await service.deleteVehicle(req.user._id, req.params['id'] as string);
  res.json(new ApiResponse(200, null, 'Vehicle removed'));
});

const setPrimaryVehicle = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await service.setPrimaryVehicle(req.user._id, req.params['id'] as string);
  res.json(new ApiResponse(200, data, 'Primary vehicle updated'));
});

export {
  getProfile, createProfile, updateProfile, deleteProfile,
  getStats, getVehicles, addVehicle, updateVehicle, deleteVehicle, setPrimaryVehicle,
};
