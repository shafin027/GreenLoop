import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  badgeName: string;
  description?: string;
  iconURL?: string;
  targetRole?: string;
  criteria?: any;
}

const badgeSchema = new Schema<IBadge>({
  badgeName: { type: String, required: true },
  description: String,
  iconURL: String,
  targetRole: { type: String, default: 'user' },
  criteria: Schema.Types.Mixed,
});

export const Badge = mongoose.model<IBadge>('Badge', badgeSchema);