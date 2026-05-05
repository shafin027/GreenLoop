import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  createdAt: Date;
}

const adminSchema = new Schema<IAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, default: 'admin' },
}, { timestamps: true });

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);