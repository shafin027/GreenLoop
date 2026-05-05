import mongoose, { Schema, Document } from 'mongoose';

export interface IFraudLog extends Document {
  collectorId: any;
  pickupId?: any;
  reason?: string;
  severity?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

const fraudLogSchema = new Schema<IFraudLog>({
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  pickupId: { type: Schema.Types.ObjectId, ref: 'Pickup' },
  reason: String,
  severity: { type: String, default: 'high' },
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  notes: String,
}, { timestamps: true });

export const FraudLog = mongoose.model<IFraudLog>('FraudLog', fraudLogSchema);