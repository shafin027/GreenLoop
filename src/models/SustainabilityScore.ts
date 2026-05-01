import mongoose, { Schema, Document } from 'mongoose';

export interface ISustainabilityScore extends Document {
  userId: any;
  score: number;
  calculationDate: Date;
  factors?: any;
}

const sustainabilityScoreSchema = new Schema<ISustainabilityScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number, required: true },
  calculationDate: { type: Date, default: Date.now },
  factors: Schema.Types.Mixed,
});

export const SustainabilityScore = mongoose.model<ISustainabilityScore>('SustainabilityScore', sustainabilityScoreSchema);