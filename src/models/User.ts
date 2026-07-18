import mongoose, { Schema, Model, HydratedDocument } from 'mongoose';

export interface IUser {
  phone: string;
  name?: string;
  email?: string;
  dob?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  city?: string;
  profilePhotoUrl?: string;
  preferredConnector?: 'CCS2' | 'CHAdeMO' | 'Type2' | 'GBT';
  preferredSpeed?: 'AC' | 'DC Fast' | 'Ultra Fast';
  walletBalance: number;
  level: string;
  isProfileComplete: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface IUserMethods {
  computeLevel(sessionCount: number): string;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    phone:               { type: String, required: true, unique: true, index: true },
    name:                { type: String, trim: true },
    email:               { type: String, trim: true, lowercase: true },
    dob:                 { type: Date },
    gender:              { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    city:                { type: String, trim: true },
    profilePhotoUrl:     { type: String },
    preferredConnector:  { type: String, enum: ['CCS2', 'CHAdeMO', 'Type2', 'GBT'] },
    preferredSpeed:      { type: String, enum: ['AC', 'DC Fast', 'Ultra Fast'] },
    walletBalance:       { type: Number, default: 0, min: 0 },
    level:               { type: String, default: 'Level 1 Starter' },
    isProfileComplete:   { type: Boolean, default: false },
    isActive:            { type: Boolean, default: true },
    lastLoginAt:         { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.computeLevel = function (sessionCount: number): string {
  if (sessionCount >= 100) return 'Level 5 Champion';
  if (sessionCount >= 50)  return 'Level 4 Pro';
  if (sessionCount >= 20)  return 'Level 3 Cruiser';
  if (sessionCount >= 5)   return 'Level 2 Explorer';
  return 'Level 1 Starter';
};

export default mongoose.model<IUser, UserModel>('User', userSchema);
