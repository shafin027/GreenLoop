import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityEvent extends Document {
  title: string;
  description?: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  imageURL?: string;
  offerings?: any;
  createdAt: Date;
}

const communityEventSchema = new Schema<ICommunityEvent>({
  title: { type: String, required: true },
  description: String,
  date: Date,
  startDate: Date,
  endDate: Date,
  location: String,
  imageURL: String,
  offerings: Schema.Types.Mixed,
}, { timestamps: true });

export const CommunityEvent = mongoose.model<ICommunityEvent>('CommunityEvent', communityEventSchema);
