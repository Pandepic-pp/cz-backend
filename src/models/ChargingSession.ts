import mongoose, { Schema, Types, HydratedDocument } from 'mongoose';

export interface StationSnapshot {
  name?: string;
  address?: string;
  city?: string;
  network?: string;
}

export interface ChargerSnapshot {
  chargerId?: string;
  connector?: string;
  type?: string;
  powerKw: number;
  pricePerKwh: number;
}

export interface VehicleSnapshot {
  brand?: string;
  model?: string;
  batteryKWh?: number;
  rangeKm?: number;
  connector?: string;
  plateNumber?: string;
}

export interface IChargingSession {
  sessionId: string;
  userId: Types.ObjectId;
  stationId: Types.ObjectId;
  stationSnapshot: StationSnapshot;
  chargerSnapshot: ChargerSnapshot;
  vehicleId?: Types.ObjectId;
  vehicleSnapshot: VehicleSnapshot;
  status: 'active' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  startSocPercent: number;
  targetSocPercent: number;
  energyDeliveredKwh: number;
  peakPowerKw: number;
  durationMin: number;
  totalCostRs: number;
  paymentMethod: 'wallet';
  paymentStatus: 'pending' | 'completed' | 'failed';
  walletBalanceAtStart: number;
  isActive: boolean;
}

export type ChargingSessionDocument = HydratedDocument<IChargingSession>;

const chargingSessionSchema = new Schema<IChargingSession>(
  {
    sessionId:   { type: String, required: true, unique: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stationId:   { type: Schema.Types.ObjectId, ref: 'ChargingStation', required: true },

    stationSnapshot: {
      name: String, address: String, city: String, network: String,
    },
    chargerSnapshot: {
      chargerId: String, connector: String, type: String,
      powerKw: Number, pricePerKwh: Number,
    },

    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    vehicleSnapshot: {
      brand: String, model: String, batteryKWh: Number,
      rangeKm: Number, connector: String, plateNumber: String,
    },

    status:      { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
    startTime:   { type: Date, required: true },
    endTime:     { type: Date },

    startSocPercent:  { type: Number, default: 0, min: 0, max: 100 },
    targetSocPercent: { type: Number, default: 80, min: 1, max: 100 },

    energyDeliveredKwh: { type: Number, default: 0 },
    peakPowerKw:        { type: Number, default: 0 },
    durationMin:        { type: Number, default: 0 },
    totalCostRs:        { type: Number, default: 0 },

    paymentMethod:        { type: String, enum: ['wallet'], default: 'wallet' },
    paymentStatus:        { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    walletBalanceAtStart: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IChargingSession>('ChargingSession', chargingSessionSchema);
