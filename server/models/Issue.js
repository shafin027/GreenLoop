import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  pickupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pickup',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issueType: {
    type: String,
    enum: ['late-collector', 'incorrect-weight', 'not-collected', 'damaged-property', ' rude-behavior', 'other'],
    required: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  // Status tracking
  status: {
    type: String,
    enum: ['open', 'in-review', 'resolved', 'rejected'],
    default: 'open',
  },
  // Resolution details
  resolutionNote: {
    type: String,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
  // Evidence
  evidencePhotos: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
issueSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;

