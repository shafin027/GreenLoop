import mongoose, { Schema, Document } from 'mongoose';

export interface IPickup extends Document {
  userId: any;
  collectorId?: any;
  centerId?: any;
  wasteType: string;
  estimatedWeight: number;
  actualWeight: number;
  status: string;
  pickupDate?: Date;
  completedAt?: Date;
  completionPhoto?: string;
  deliveryProofImages?: string[];
  co2Reduced: number;
  ecoPointsEarned: number;
  routeOptimized?: any;
  deliveryCharge: number;
  rating?: { stars: number; review?: string; ratedAt: Date };
  createdAt: Date;
}

const pickupSchema = new Schema<IPickup>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  centerId: { type: Schema.Types.ObjectId, ref: 'RecyclingCenter' },
  wasteType: { type: String, required: true },
  estimatedWeight: { type: Number, required: true },
  actualWeight: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  pickupDate: Date,
  completedAt: Date,
  completionPhoto: String,
  deliveryProofImages: { type: [String], default: [] },
  co2Reduced: { type: Number, default: 0 },
  ecoPointsEarned: { type: Number, default: 0 },
  routeOptimized: Schema.Types.Mixed,
  deliveryCharge: { type: Number, default: 60 },
  rating: {
    stars: { type: Number, min: 1, max: 5 },
    review: String,
    ratedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true });

export const Pickup = mongoose.model<IPickup>('Pickup', pickupSchema);