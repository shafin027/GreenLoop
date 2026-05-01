import mongoose, { Schema, Document } from 'mongoose';

export interface IWasteLog extends Document {
  centerId: any;
  category: string;
  weight: number;
  carbonCreditsEarned: number;
  createdAt: Date;
}

const wasteLogSchema = new Schema<IWasteLog>({
  centerId: { type: Schema.Types.ObjectId, ref: 'RecyclingCenter' },
  category: { type: String, required: true },
  weight: { type: Number, required: true },
  carbonCreditsEarned: { type: Number, default: 0 },
}, { timestamps: true });

export const WasteLog = mongoose.model<IWasteLog>('WasteLog', wasteLogSchema);
