import { Types } from 'mongoose';
import ChargingStation from '../models/ChargingStation.js';
import ChargingSession from '../models/ChargingSession.js';
import Transaction from '../models/Transaction.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import type { ChargerSnapshot, VehicleSnapshot, ChargingSessionDocument } from '../models/ChargingSession.js';

const MIN_WALLET_BALANCE = 50;
const PETROL_COST_PER_KM = 6.67; // ₹100/L at 15 km/L

export interface StartSessionBody {
  stationId: string;
  chargerId: string;
  targetSocPercent?: number;
  startSocPercent?: number;
  vehicleId?: string;
}

export interface LiveData {
  currentSocPercent: number;
  targetSocPercent: number;
  currentPowerKw: number;
  timeElapsed: string;         // HH:MM:SS
  energyDeliveredKwh: number;
  estimatedCostRs: number;
  estimatedRangeKm: number;
  fuelSavingsRs: number;
}

export interface ConnectorStatus {
  connected: boolean;
  locked: boolean;
  powerFlow: boolean;
  vehicleCommunication: boolean;
}

export interface SessionWithLive {
  live: LiveData | null;
  connectorStatus: ConnectorStatus;
  [key: string]: unknown;
}

export interface SessionHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface PaginatedSessions {
  sessions: unknown[];
  total: number;
  page: number;
  totalPages: number;
}

interface SessionForLive {
  startTime: Date;
  startSocPercent: number;
  targetSocPercent: number;
  chargerSnapshot: ChargerSnapshot;
  vehicleSnapshot?: VehicleSnapshot;
}

const generateSessionId = async (): Promise<string> => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dayStart = new Date(yyyy, now.getMonth(), now.getDate());
  const count = await ChargingSession.countDocuments({ createdAt: { $gte: dayStart } });
  return `S${yyyy}-${mm}-${dd}-${String(count + 1).padStart(4, '0')}`;
};

const computeLiveData = (session: SessionForLive): LiveData => {
  const elapsedMs   = Date.now() - session.startTime.getTime();
  const elapsedSec  = Math.floor(elapsedMs / 1000);
  const elapsedHours = elapsedMs / 3_600_000;

  const { powerKw, pricePerKwh } = session.chargerSnapshot;
  const batteryKWh = session.vehicleSnapshot?.batteryKWh ?? 40;
  const rangeKm    = session.vehicleSnapshot?.rangeKm    ?? 400;
  const startSoc   = session.startSocPercent ?? 0;
  const targetSoc  = session.targetSocPercent ?? 80;

  const rawEnergyKwh      = powerKw * elapsedHours;
  const maxEnergyKwh      = ((targetSoc - startSoc) / 100) * batteryKWh;
  const energyDeliveredKwh = parseFloat(Math.min(rawEnergyKwh, maxEnergyKwh).toFixed(2));

  const chargedPct       = batteryKWh > 0 ? (energyDeliveredKwh / batteryKWh) * 100 : 0;
  const currentSoc       = parseFloat(Math.min(targetSoc, startSoc + chargedPct).toFixed(1));
  const estimatedCostRs  = parseFloat((energyDeliveredKwh * pricePerKwh).toFixed(2));
  const estimatedRangeKm = Math.round((currentSoc / 100) * rangeKm);

  const kmAdded       = Math.max(0, estimatedRangeKm - Math.round((startSoc / 100) * rangeKm));
  const fuelSavingsRs = parseFloat(Math.max(0, kmAdded * PETROL_COST_PER_KM - estimatedCostRs).toFixed(2));

  const h = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
  const s = String(elapsedSec % 60).padStart(2, '0');

  return {
    currentSocPercent: currentSoc,
    targetSocPercent: targetSoc,
    currentPowerKw: currentSoc >= targetSoc ? 0 : powerKw,
    timeElapsed: `${h}:${m}:${s}`,
    energyDeliveredKwh,
    estimatedCostRs,
    estimatedRangeKm,
    fuelSavingsRs,
  };
};

const startSession = async (userId: Types.ObjectId, body: StartSessionBody): Promise<ChargingSessionDocument> => {
  const { stationId, chargerId, targetSocPercent = 80, startSocPercent = 0, vehicleId } = body;

  const existing = await ChargingSession.findOne({ userId, status: 'active' });
  if (existing) throw new ApiError(409, 'You already have an active charging session.');

  const station = await ChargingStation.findOne({ _id: stationId, isActive: true });
  if (!station) throw new ApiError(404, 'Charging station not found');

  const charger = station.chargers.find((c) => c.chargerId === chargerId);
  if (!charger) throw new ApiError(404, `Charger ${chargerId} not found at this station`);
  if (charger.status !== 'available') {
    throw new ApiError(409, `Charger ${chargerId} is currently ${charger.status}`);
  }

  const user = await User.findById(userId);
  if (!user || user.walletBalance < MIN_WALLET_BALANCE) {
    throw new ApiError(402, `Insufficient wallet balance. Minimum ₹${MIN_WALLET_BALANCE} required to start charging.`);
  }

  const vehicle = vehicleId
    ? await Vehicle.findOne({ _id: vehicleId, userId, isActive: true }).lean()
    : await Vehicle.findOne({ userId, isPrimary: true, isActive: true }).lean();

  if (vehicleId && !vehicle) throw new ApiError(404, 'Vehicle not found');

  await ChargingStation.updateOne(
    { _id: stationId, 'chargers.chargerId': chargerId },
    { $set: { 'chargers.$.status': 'in_use' }, $inc: { availableChargers: -1 } }
  );

  const sessionId = await generateSessionId();
  const session = await ChargingSession.create({
    sessionId,
    userId,
    stationId,
    stationSnapshot: {
      name: station.name, address: station.address,
      city: station.city, network: station.network,
    },
    chargerSnapshot: {
      chargerId: charger.chargerId, connector: charger.connector,
      type: charger.type, powerKw: charger.powerKw, pricePerKwh: charger.pricePerKwh,
    },
    vehicleId: vehicle?._id ?? null,
    vehicleSnapshot: vehicle
      ? {
          brand: vehicle.brand, model: vehicle.model, batteryKWh: vehicle.batteryKWh,
          rangeKm: vehicle.rangeKm, connector: vehicle.connector, plateNumber: vehicle.plateNumber,
        }
      : {},
    status: 'active',
    startTime: new Date(),
    startSocPercent,
    targetSocPercent,
    paymentMethod: 'wallet',
    paymentStatus: 'pending',
    walletBalanceAtStart: user.walletBalance,
  });

  return session;
};

const getSession = async (userId: Types.ObjectId, sessionId: string): Promise<SessionWithLive> => {
  const session = await ChargingSession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new ApiError(404, 'Session not found');

  const live = session.status === 'active' ? computeLiveData(session) : null;

  return {
    ...session,
    live,
    connectorStatus: session.status === 'active'
      ? { connected: true, locked: true, powerFlow: true, vehicleCommunication: true }
      : { connected: false, locked: false, powerFlow: false, vehicleCommunication: false },
  };
};

const stopSession = async (userId: Types.ObjectId, sessionId: string) => {
  const session = await ChargingSession.findOne({ _id: sessionId, userId, status: 'active' });
  if (!session) throw new ApiError(404, 'No active session found');

  const live = computeLiveData(session);
  const finalCost = live.estimatedCostRs;
  const endTime = new Date();
  const durationMin = Math.round((endTime.getTime() - session.startTime.getTime()) / 60_000);

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  const balanceBefore = user.walletBalance;

  const amountCharged = Math.min(finalCost, balanceBefore);
  user.walletBalance = parseFloat((balanceBefore - amountCharged).toFixed(2));

  const completedCount = await ChargingSession.countDocuments({ userId, status: 'completed' });
  user.level = user.computeLevel(completedCount + 1);
  await user.save();

  session.status = 'completed';
  session.endTime = endTime;
  session.energyDeliveredKwh = live.energyDeliveredKwh;
  session.peakPowerKw = session.chargerSnapshot.powerKw;
  session.durationMin = durationMin;
  session.totalCostRs = amountCharged;
  session.paymentStatus = amountCharged >= finalCost ? 'completed' : 'pending';
  await session.save();

  const transaction = await Transaction.create({
    userId,
    sessionId: session._id,
    type: 'debit',
    amount: amountCharged,
    description: `Charging session at ${session.stationSnapshot.name}`,
    balanceBefore,
    balanceAfter: user.walletBalance,
    status: 'completed',
    metadata: {
      sessionId: session.sessionId,
      energyKwh: live.energyDeliveredKwh,
      durationMin,
    },
  });

  await ChargingStation.updateOne(
    { _id: session.stationId, 'chargers.chargerId': session.chargerSnapshot.chargerId },
    { $set: { 'chargers.$.status': 'available' }, $inc: { availableChargers: 1 } }
  );

  return { session, transaction, walletBalance: user.walletBalance };
};

const getSessionHistory = async (userId: Types.ObjectId, { page = 1, limit = 20, status }: SessionHistoryParams = {}): Promise<PaginatedSessions> => {
  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    ChargingSession.find(filter).sort({ startTime: -1 }).skip(skip).limit(limit).lean(),
    ChargingSession.countDocuments(filter),
  ]);

  return { sessions, total, page, totalPages: Math.ceil(total / limit) };
};

export { startSession, getSession, stopSession, getSessionHistory };
