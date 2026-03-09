import mongoose from 'mongoose';

const pickupSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profile_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  waste_type: {
    type: String,
    enum: ['plastic', 'paper', 'glass', 'metal', 'e_waste', 'organic', 'other'],
    required: true,
  },
  weight: {
    type: Number,
    required: true, // in kg
  },
  points_earned: {
    type: Number,
    default: 0,
  },
  co2_saved: {
    type: Number,
    default: 0, // in kg
  },
  status: {
    type: String,
    enum: ['scheduled', 'pending', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  pickup_date: {
    type: Date,
    required: true,
  },
  pickup_time: {
    type: String, // e.g., "09:00 AM"
  },
  address: {
    street: String,
    city: String,
    district: String,
    zip_code: String,
  },
  notes: {
    type: String,
  },
  collector_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  collected_at: {
    type: Date,
  },
  is_fraudulent: {
    type: Boolean,
    default: false,
  },
  fraud_reason: {
    type: String,
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

// Calculate points and CO2 saved before saving
pickupSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Calculate points based on waste type and weight
  const pointsPerKg = {
    plastic: 20,
    paper: 10,
    glass: 30,
    metal: 25,
    e_waste: 100,
    organic: 5,
    other: 15,
  };
  
  const co2PerKg = {
    plastic: 6.0,
    paper: 3.5,
    glass: 1.5,
    metal: 8.0,
    e_waste: 15.0,
    organic: 2.0,
    other: 4.0,
  };
  
  const type = this.waste_type;
  this.points_earned = Math.round((pointsPerKg[type] || 10) * this.weight);
  this.co2_saved = parseFloat(((co2PerKg[type] || 4) * this.weight).toFixed(2));
  
  next();
});

const Pickup = mongoose.model('Pickup', pickupSchema);

export default Pickup;
