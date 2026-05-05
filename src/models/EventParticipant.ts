import mongoose, { Schema, Document } from 'mongoose';

export interface IEventParticipant extends Document {
  eventId: any;
  userId: any;
  role?: string;
  offering?: string;
  discount?: string;
  createdAt: Date;
}


// Event model added
const eventParticipantSchema = new Schema<IEventParticipant>({
  eventId: { type: Schema.Types.ObjectId, ref: 'CommunityEvent' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  role: String,
  offering: String,
  discount: String,
}, { timestamps: true });

export const EventParticipant = mongoose.model<IEventParticipant>('EventParticipant', eventParticipantSchema);
