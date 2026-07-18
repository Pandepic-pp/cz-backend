import mongoose, { Schema, HydratedDocument } from 'mongoose';

export interface ICharger {
  chargerId: string;
  connector: 'CCS2' | 'CHAdeMO' | 'Type2' | 'GBT';
  type: 'AC Slow' | 'DC Fast' | 'Ultra Fast';
  powerKw: number;
  pricePerKwh: number;
  status: 'available' | 'in_use' | 'offline' | 'faulted';
}

export interface IChargingStation {
  name: string;
  network?: string;
  address: string;
  city: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  isVerified: boolean;
  isOpen24x7: boolean;
  openHours?: string;
  amenities?: string[];
  chargers: ICharger[];
  totalChargers: number;
  availableChargers: number;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  isActive: boolean;
}

export type ChargingStationDocument = HydratedDocument<IChargingStation>;

const chargerSchema = new Schema<ICharger>(
  {
    chargerId:   { type: String, required: true },
    connector:   { type: String, required: true, enum: ['CCS2', 'CHAdeMO', 'Type2', 'GBT'] },
    type:        { type: String, required: true, enum: ['AC Slow', 'DC Fast', 'Ultra Fast'] },
    powerKw:     { type: Number, required: true },
    pricePerKwh: { type: Number, required: true },
    status:      { type: String, enum: ['available', 'in_use', 'offline', 'faulted'], default: 'available' },
  },
  { _id: false }
);

const chargingStationSchema = new Schema<IChargingStation>(
  {
    name:              { type: String, required: true, trim: true },
    network:           { type: String, trim: true },
    address:           { type: String, required: true, trim: true },
    city:              { type: String, required: true, trim: true, index: true },
    location: {
      type:            { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates:     { type: [Number], required: true }, // [lng, lat]
    },
    isVerified:        { type: Boolean, default: false },
    isOpen24x7:        { type: Boolean, default: false },
    openHours:         { type: String },
    amenities:         [String],
    chargers:          [chargerSchema],
    totalChargers:     { type: Number, default: 0 },
    availableChargers: { type: Number, default: 0 },
    rating:            { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:       { type: Number, default: 0 },
    imageUrl:          { type: String },
    isActive:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

chargingStationSchema.index({ location: '2dsphere' });

export default mongoose.model<IChargingStation>('ChargingStation', chargingStationSchema);
