import mongoose, { Schema, Document } from 'mongoose';

export interface IEarningsHistory extends Document {
  collectorId: any;
  day: string;
  earnings: number;
  pickups: number;
  bonus: number;
  createdAt: Date;
}

const earningsHistorySchema = new Schema<IEarningsHistory>({
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  day: { type: String, required: true },
  earnings: { type: Number, default: 0 },
  pickups: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
}, { timestamps: true });

export const EarningsHistory = mongoose.model<IEarningsHistory>('EarningsHistory', earningsHistorySchema);
