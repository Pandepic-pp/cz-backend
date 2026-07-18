import mongoose, { Schema, Types, HydratedDocument } from 'mongoose';

export interface IVehicle {
  userId: Types.ObjectId;
  brand: string;
  model: string;
  type: 'BEV' | 'PHEV' | 'HYBRID';
  batteryKWh?: number;
  rangeKm?: number;
  connector?: 'CCS2' | 'CHAdeMO' | 'Type2' | 'GBT' | 'CCS1';
  plateNumber?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export type VehicleDocument = HydratedDocument<IVehicle>;

const vehicleSchema = new Schema<IVehicle>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand:       { type: String, required: true, trim: true },
    model:       { type: String, required: true, trim: true },
    type:        { type: String, enum: ['BEV', 'PHEV', 'HYBRID'], required: true },
    batteryKWh:  { type: Number, min: 0 },
    rangeKm:     { type: Number, min: 0 },
    connector:   { type: String, enum: ['CCS2', 'CHAdeMO', 'Type2', 'GBT', 'CCS1'] },
    plateNumber: { type: String, trim: true, uppercase: true },
    isPrimary:   { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVehicle>('Vehicle', vehicleSchema);
