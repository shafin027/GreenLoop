import mongoose, { Schema, Document } from 'mongoose';

export interface ICollector extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  assignedArea?: string;
  totalWeightCollected: number;
  totalPickups: number;
  totalEarnings: number;
  weeklyPickups: number;
  weeklyEarnings: number;
  weeklyBonusEarned: number;
  weekResetDate: Date;
  performanceRating: number;
  totalRatings: number;
  ratingSum: number;
  badges: string[];
  role: string;
  verified: boolean;
  isBanned: boolean;
  createdAt: Date;
  currentLocation?: { lat: number; lng: number; updatedAt: Date };
}

const collectorSchema = new Schema<ICollector>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  assignedArea: String,
  totalWeightCollected: { type: Number, default: 0 },
  totalPickups: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  weeklyPickups: { type: Number, default: 0 },
  weeklyEarnings: { type: Number, default: 0 },
  weeklyBonusEarned: { type: Number, default: 0 },
  weekResetDate: { type: Date, default: Date.now },
  performanceRating: { type: Number, default: 5.0 },
  totalRatings: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'collector' },
  verified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true });

export const Collector = mongoose.model<ICollector>('Collector', collectorSchema);