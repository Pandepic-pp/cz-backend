import ChargingStation from '../models/ChargingStation.js';
import ApiError from '../utils/ApiError.js';

export interface NearbyParams {
  lat: number;
  lng: number;
  radius?: number;
  connector?: string;
  type?: string;
}

export interface StationWithDistance {
  distanceKm: number;
  [key: string]: unknown;
}

const haversineKm = ([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNearbyStations = async ({ lat, lng, radius = 5000, connector, type }: NearbyParams): Promise<StationWithDistance[]> => {
  const filter: Record<string, unknown> = {
    isActive: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  };

  if (connector) filter['chargers.connector'] = connector;
  if (type)      filter['chargers.type'] = type;

  const stations = await ChargingStation.find(filter).limit(50).lean();

  const origin: [number, number] = [lng, lat];
  return stations.map((s) => ({
    ...s,
    distanceKm: parseFloat(haversineKm(origin, s.location.coordinates as [number, number]).toFixed(2)),
  }));
};

const getStationById = async (stationId: string) => {
  const station = await ChargingStation.findOne({ _id: stationId, isActive: true }).lean();
  if (!station) throw new ApiError(404, 'Station not found');
  return station;
};

export { getNearbyStations, getStationById };
