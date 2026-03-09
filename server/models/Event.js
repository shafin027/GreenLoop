import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
  },
  type: {
    type: String,
    enum: ['community-event', 'neighborhood-challenge', 'campaign'],
    required: true,
  },
  // Event details
  location: {
    address: String,
    city: String,
    district: String,
  },
  // Date range
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  // Event image
  imageURL: {
    type: String,
  },
  // Rewards
  rewardMultiplier: {
    type: Number,
    default: 1, // e.g., 2 = 2x eco points
  },
  rewardPoints: {
    type: Number,
    default: 0, // Bonus points for participation
  },
  // Participants (users who joined)
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  participantCount: {
    type: Number,
    default: 0,
  },
  // Max participants (optional)
  maxParticipants: {
    type: Number,
  },
  // Target goals for challenges
  targetWeight: {
    type: Number, // in kg
  },
  currentWeight: {
    type: Number,
    default: 0,
  },
  targetParticipants: {
    type: Number,
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  // Organizer
  organizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for querying
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ type: 1 });

// Update timestamp on save
eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  this.participantCount = this.participants.length;
  next();
});

// Virtual for checking if event is active
eventSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
});

const Event = mongoose.model('Event', eventSchema);

export default Event;

