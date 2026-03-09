import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  full_name: {
    type: String,
    trim: true,
  },
  user_type: {
    type: String,
    enum: ['household', 'business', 'collector', 'recycling_center'],
    default: 'household',
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    district: String,
    zip_code: String,
  },
  eco_points: {
    type: Number,
    default: 0,
  },
  co2_saved: {
    type: Number,
    default: 0, // in kg
  },
  total_pickups: {
    type: Number,
    default: 0,
  },
  streak_days: {
    type: Number,
    default: 0,
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

// Update timestamp on save
profileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
