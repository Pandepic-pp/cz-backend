import { Types } from 'mongoose';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import ChargingSession from '../models/ChargingSession.js';
import ApiError from '../utils/ApiError.js';

export interface CreateProfileBody {
  name: string;
  email?: string;
  dob?: Date;
  gender?: string;
  city?: string;
  preferredConnector?: string;
  preferredSpeed?: string;
  vehicle?: {
    brand: string;
    model: string;
    type: string;
    batteryKWh?: number;
    rangeKm?: number;
    connector?: string;
    plateNumber?: string;
  };
}

export interface UpdateProfileBody {
  name?: string;
  email?: string;
  dob?: Date;
  gender?: string;
  city?: string;
  preferredConnector?: string;
  preferredSpeed?: string;
}

export interface VehicleBody {
  brand: string;
  model: string;
  type: string;
  batteryKWh?: number;
  rangeKm?: number;
  connector?: string;
  plateNumber?: string;
  isPrimary?: boolean;
}

export interface StatsResult {
  totalSessions: number;
  totalSpentINR: number;
  totalEnergyKWh: number;
  avgSessionDurationMin: number;
  vehicleCount: number;
  level: string;
}

const getProfile = async (userId: Types.ObjectId) => {
  const user = await User.findOne({ _id: userId, isActive: true }).lean();
  if (!user) throw new ApiError(404, 'Profile not found');

  const vehicles = await Vehicle.find({ userId, isActive: true })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();

  return { ...user, vehicles };
};

const createProfile = async (userId: Types.ObjectId, data: CreateProfileBody) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isProfileComplete) {
    throw new ApiError(409, 'Profile already created. Use PUT /api/profile to update.');
  }

  const { vehicle, ...profileFields } = data;
  Object.assign(user, profileFields);
  user.isProfileComplete = true;
  await user.save();

  let savedVehicle = null;
  if (vehicle) {
    savedVehicle = await Vehicle.create({
      userId,
      ...vehicle,
      plateNumber: vehicle.plateNumber?.toUpperCase(),
      isPrimary: true,
    });
  }

  return { user: user.toObject(), vehicle: savedVehicle };
};

const updateProfile = async (userId: Types.ObjectId, data: UpdateProfileBody) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, isActive: true },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const deleteProfile = async (userId: Types.ObjectId): Promise<void> => {
  await Vehicle.updateMany({ userId }, { isActive: false });
  await User.findByIdAndUpdate(userId, { isActive: false });
};

const getStats = async (userId: Types.ObjectId): Promise<StatsResult> => {
  const [user, vehicleCount, agg] = await Promise.all([
    User.findById(userId).lean(),
    Vehicle.countDocuments({ userId, isActive: true }),
    ChargingSession.aggregate<{
      totalSessions: number;
      totalSpentINR: number;
      totalEnergyKWh: number;
      avgSessionDurationMin: number;
    }>([
      { $match: { userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalSessions:        { $sum: 1 },
          totalSpentINR:        { $sum: '$totalCostRs' },
          totalEnergyKWh:       { $sum: '$energyDeliveredKwh' },
          avgSessionDurationMin: { $avg: '$durationMin' },
        },
      },
    ]),
  ]);

  const stats = agg[0] ?? {} as Partial<typeof agg[0]>;

  return {
    totalSessions:        stats.totalSessions        ?? 0,
    totalSpentINR:        parseFloat((stats.totalSpentINR  ?? 0).toFixed(2)),
    totalEnergyKWh:       parseFloat((stats.totalEnergyKWh ?? 0).toFixed(2)),
    avgSessionDurationMin: Math.round(stats.avgSessionDurationMin ?? 0),
    vehicleCount,
    level: user?.level ?? 'Level 1 Starter',
  };
};

const getVehicles = async (userId: Types.ObjectId) =>
  Vehicle.find({ userId, isActive: true }).sort({ isPrimary: -1, createdAt: -1 }).lean();

const addVehicle = async (userId: Types.ObjectId, data: VehicleBody) => {
  const existingCount = await Vehicle.countDocuments({ userId, isActive: true });

  if (data.isPrimary || existingCount === 0) {
    await Vehicle.updateMany({ userId }, { isPrimary: false });
    data.isPrimary = true;
  }

  return Vehicle.create({ userId, ...data, plateNumber: data.plateNumber?.toUpperCase() });
};

const updateVehicle = async (userId: Types.ObjectId, vehicleId: string, data: Partial<VehicleBody>) => {
  if (data.isPrimary === true) {
    await Vehicle.updateMany({ userId }, { isPrimary: false });
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, userId, isActive: true },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  return vehicle;
};

const deleteVehicle = async (userId: Types.ObjectId, vehicleId: string): Promise<void> => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, userId, isActive: true },
    { isActive: false, isPrimary: false },
    { new: false }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');

  if (vehicle.isPrimary) {
    const next = await Vehicle.findOne({ userId, isActive: true }).sort({ createdAt: -1 });
    if (next) { next.isPrimary = true; await next.save(); }
  }
};

const setPrimaryVehicle = async (userId: Types.ObjectId, vehicleId: string) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId, isActive: true });
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');

  await Vehicle.updateMany({ userId }, { isPrimary: false });
  vehicle.isPrimary = true;
  await vehicle.save();
  return vehicle;
};

export {
  getProfile, createProfile, updateProfile, deleteProfile,
  getStats, getVehicles, addVehicle, updateVehicle, deleteVehicle, setPrimaryVehicle,
};
