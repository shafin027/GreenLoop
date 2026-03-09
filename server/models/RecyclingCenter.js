import mongoose from 'mongoose';

const recyclingCenterSchema = new mongoose.Schema({
  centerName: {
    type: String,
    required: [true, 'Center name is required'],
    trim: true,
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
  },
  // Contact info
  contactPerson: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  // Address
  address: {
    street: String,
    city: String,
    district: String,
    zipCode: String,
    lat: Number,
    lng: Number,
  },
  // Operating hours
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  // Accepted waste types
  acceptedWasteTypes: [{
    type: String,
    enum: ['plastic', 'paper', 'glass', 'metal', 'organic', 'ewaste', 'hazardous', 'construction', 'textile', 'other'],
  }],
  // Assigned collectors
  assignedCollectors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Capacity & stats
  dailyCapacity: {
    type: Number, // in kg
  },
  currentLoad: {
    type: Number,
    default: 0,
  },
  // Processing stats
  totalWasteProcessed: {
    type: Number,
    default: 0, // in kg
  },
  totalCarbonReduced: {
    type: Number,
    default: 0, // in kg
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'suspended'],
    default: 'pending',
  },
  // Certifications
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date,
  }],
  // Notes
  notes: {
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

// Indexes
recyclingCenterSchema.index({ city: 1, district: 1 });
recyclingCenterSchema.index({ isActive: 1 });
recyclingCenterSchema.index({ verificationStatus: 1 });

// Update timestamp on save
recyclingCenterSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for utilization percentage
recyclingCenterSchema.virtual('utilizationPercentage').get(function() {
  if (!this.dailyCapacity || this.dailyCapacity === 0) return 0;
  return Math.round((this.currentLoad / this.dailyCapacity) * 100);
});

const RecyclingCenter = mongoose.model('RecyclingCenter', recyclingCenterSchema);

export default RecyclingCenter;

