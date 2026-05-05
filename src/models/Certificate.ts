import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificate extends Document {
  issuedToId: string;
  issuedToType: string;
  certificateType: string;
  issueDate: Date;
  expiryDate?: Date;
  verifiedData?: any;
  certificateURL?: string;
  createdAt: Date;
}

const certificateSchema = new Schema<ICertificate>({
  issuedToId: { type: String, required: true },
  issuedToType: { type: String, required: true },
  certificateType: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  expiryDate: Date,
  verifiedData: Schema.Types.Mixed,
  certificateURL: String,
}, { timestamps: true });

export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);