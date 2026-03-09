import mongoose from 'mongoose';

const fraudLogSchema = new mongoose.Schema({
  pickupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pickup',
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Alert details
  alertType: {
    type: String,
    enum: ['weight-anomaly', 'impossible-count', 'suspicious-pattern', 'duplicate-entry', 'unusual-location', 'rapid-collection'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  // Severity level
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'low',
  },
  // Evidence/data
  evidence: {
    reportedWeight: Number,
    expectedWeight: Number,
    anomalyScore: Number,
    location: {
      lat: Number,
      lng: Number,
    },
    timestamp: Date,
    additionalData: mongoose.Schema.Types.Mixed,
  },
  // Resolution
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolutionNote: {
    type: String,
  },
  resolvedAt: {
    type: Date,
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'investigating', 'confirmed', 'false-positive', 'resolved'],
    default: 'pending',
  },
  // Action taken
  actionTaken: {
    type: String,
    enum: ['none', 'warning-issued', 'account-suspended', 'report-filed', 'flagged-for-review'],
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

// Indexes for efficient querying
fraudLogSchema.index({ collectorId: 1 });
fraudLogSchema.index({ severity: 1 });
fraudLogSchema.index({ resolved: 1, status: 1 });
fraudLogSchema.index({ createdAt: -1 });
fraudLogSchema.index({ alertType: 1 });

// Update timestamp on save
fraudLogSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to detect anomalies
fraudLogSchema.statics.detectAnomalies = async function(collectorId, pickupData) {
  const alerts = [];
  
  // Check for unrealistic weight
  if (pickupData.weight > 100) {
    alerts.push({
      alertType: 'weight-anomaly',
      description: `Unusually high weight recorded: ${pickupData.weight}kg`,
      severity: pickupData.weight > 500 ? 'critical' : 'high',
      evidence: {
        reportedWeight: pickupData.weight,
        anomalyScore: pickupData.weight / 100,
      },
    });
  }
  
  // Check for impossible count (too many pickups in short time)
  const recentPickups = await mongoose.model('Pickup').countDocuments({
    collectorId,
    collected_at: {
      $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    },
  });
  
  if (recentPickups > 10) {
    alerts.push({
      alertType: 'impossible-count',
      description: `Too many pickups in last hour: ${recentPickups}`,
      severity: 'high',
      evidence: {
        count: recentPickups,
        timeWindow: '1 hour',
      },
    });
  }
  
  return alerts;
};

const FraudLog = mongoose.model('FraudLog', fraudLogSchema);

export default FraudLog;

