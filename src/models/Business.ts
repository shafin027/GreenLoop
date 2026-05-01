import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
  companyName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  location?: { lat: number; lng: number };
  carbonCreditsPurchased: number;
  badges: string[];
  role: string;
  verified: boolean;
  isBanned: boolean;
  createdAt: Date;
}

const businessSchema = new Schema<IBusiness>({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  location: { lat: Number, lng: Number },
  carbonCreditsPurchased: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'business' },
  verified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

export const Business = mongoose.model<IBusiness>('Business', businessSchema);