import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  authorId: any;
  title: string;
  content?: string;
  images: string[];
  isApproved: boolean;
  likes: number;
  likedBy: any[];
  createdAt: Date;
}

const postSchema = new Schema<IPost>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  content: String,
  images: { type: [String], default: [] },
  isApproved: { type: Boolean, default: true },
  likes: { type: Number, default: 0 },
  likedBy: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true });

export const Post = mongoose.model<IPost>('Post', postSchema);