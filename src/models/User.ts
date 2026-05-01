import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: { lat: number; lng: number; address?: string; };
  ecoPoints: number;
  totalCO2Reduced: number;
  badges: string[];
  sustainabilityScore: number;
  carbonCreditsBalance: number;
  verified: boolean;
  role: string;
  isBanned: boolean;
  createdAt: Date;
  redeemedRewards: { rewardId: number; rewardTitle: string; pointsCost: number; redeemedAt: Date }[];
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  location: { lat: Number, lng: Number, address: String },
  ecoPoints: { type: Number, default: 0 },
  totalCO2Reduced: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  sustainabilityScore: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  carbonCreditsBalance: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  role: { type: String, default: 'user' },
  redeemedRewards: {
    type: [{
      rewardId: Number,
      rewardTitle: String,
      pointsCost: Number,
      redeemedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);