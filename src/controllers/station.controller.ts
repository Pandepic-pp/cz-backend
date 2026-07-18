import { Response } from 'express';
import { getNearbyStations, getStationById } from '../services/station.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AuthRequest } from '../middleware/auth.js';

const nearby = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { lat, lng, radius, connector, type } = req.query as {
    lat: string; lng: string; radius?: string; connector?: string; type?: string;
  };
  const stations = await getNearbyStations({
    lat: Number(lat), lng: Number(lng),
    radius: radius ? Number(radius) : undefined,
    connector, type,
  });
  res.json(new ApiResponse(200, { stations, total: stations.length }, 'Nearby stations fetched'));
});

const getById = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const station = await getStationById(req.params['id'] as string);
  res.json(new ApiResponse(200, station, 'Station fetched'));
});

export { nearby, getById };
