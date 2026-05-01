import mongoose, { Schema, Document } from 'mongoose';

export interface IIssue extends Document {
  pickupId: any;
  userId?: any;
  collectorId?: any;
  issueType: string;
  description?: string;
  status: string;
  resolutionNote?: string;
  createdAt: Date;
}

const issueSchema = new Schema<IIssue>({
  pickupId: { type: Schema.Types.ObjectId, ref: 'Pickup' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  issueType: { type: String, required: true },
  description: String,
  status: { type: String, default: 'open' },
  resolutionNote: String,
}, { timestamps: true });

export const Issue = mongoose.model<IIssue>('Issue', issueSchema);