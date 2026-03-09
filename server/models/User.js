import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['household', 'business', 'collector', 'recycling_center', 'admin', 'moderator'],
    default: 'household',
  },
  // Location for waste pickup
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  // Household grouping (optional)
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Gamification
  ecoPoints: {
    type: Number,
    default: 0,
  },
  totalCO2Reduced: {
    type: Number,
    default: 0, // in kg
  },
  // Earned badges
  badges: [{
    type: String, // badge ID or name
  }],
  // Streak tracking
  streakDays: {
    type: Number,
    default: 0,
  },
  lastPickupDate: {
    type: Date,
  },
  // Collector specific fields
  assignedArea: {
    type: String, // zone or region
  },
  totalWeightCollected: {
    type: Number,
    default: 0,
  },
  totalPickupsCompleted: {
    type: Number,
    default: 0,
  },
  performanceRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update timestamp on save
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate eco points based on waste type and weight
userSchema.methods.calculatePoints = function(wasteType, weight) {
  const pointsPerKg = {
    plastic: 20,
    paper: 10,
    glass: 30,
    metal: 25,
    e_waste: 100,
    organic: 5,
    ewaste: 100,
    other: 15,
  };
  return Math.round((pointsPerKg[wasteType] || 10) * weight);
};

// Calculate CO2 saved based on waste type and weight
userSchema.methods.calculateCO2Saved = function(wasteType, weight) {
  const co2PerKg = {
    plastic: 6.0,
    paper: 3.5,
    glass: 1.5,
    metal: 8.0,
    e_waste: 15.0,
    organic: 2.0,
    ewaste: 15.0,
    other: 4.0,
  };
  return parseFloat(((co2PerKg[wasteType] || 4) * weight).toFixed(2));
};

const User = mongoose.model('User', userSchema);

export default User;

