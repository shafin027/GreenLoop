import mongoose, { Schema, Document } from 'mongoose';

export interface ICarbonCredit extends Document {
  businessId?: any;
  centerId?: any;
  amount: number;
  price: number;
  status: string;
  source?: string;
  purchaseDate?: Date;
  createdAt: Date;
}

const carbonCreditSchema = new Schema<ICarbonCredit>({
  businessId: Schema.Types.ObjectId,
  centerId: Schema.Types.ObjectId,
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'available' },
  source: String,
  purchaseDate: Date,
}, { timestamps: true });

export const CarbonCredit = mongoose.model<ICarbonCredit>('CarbonCredit', carbonCreditSchema);