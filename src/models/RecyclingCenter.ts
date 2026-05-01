import mongoose, { Schema, Document } from 'mongoose';

export interface IRecyclingCenter extends Document {
  centerName: string;
  email: string;
  password: string;
  phone?: string;
  licenseNumber?: string;
  address?: string;
  location?: { lat: number; lng: number };
  totalWasteProcessed: number;
  totalCarbonReduced: number;
  carbonCreditsBalance: number;
  badges: string[];
  role: string;
  isApproved: boolean;
  isBanned: boolean;
  createdAt: Date;
}

const recyclingCenterSchema = new Schema<IRecyclingCenter>({
  centerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  licenseNumber: String,
  address: String,
  location: { lat: Number, lng: Number },
  totalWasteProcessed: { type: Number, default: 0 },
  totalCarbonReduced: { type: Number, default: 0 },
  carbonCreditsBalance: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'recycling_center' },
  isApproved: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

export const RecyclingCenter = mongoose.model<IRecyclingCenter>('RecyclingCenter', recyclingCenterSchema);