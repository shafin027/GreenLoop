import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  badgeName: {
    type: String,
    required: [true, 'Badge name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Badge description is required'],
  },
  iconURL: {
    type: String,
    default: '',
  },
  criteria: {
    type: {
      type: String,
      enum: ['ecoPoints', 'co2Reduced', 'pickupsCompleted', 'streakDays', 'wasteType'],
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    wasteType: {
      type: String,
      enum: ['plastic', 'paper', 'glass', 'metal', 'organic', 'ewaste', 'all'],
    },
  },
  pointsValue: {
    type: Number,
    default: 0,
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Static method to check if user qualifies for badge
badgeSchema.statics.checkEligibility = async function(user) {
  const badges = await this.find();
  const earnedBadges = [];
  
  for (const badge of badges) {
    const { type, threshold, wasteType } = badge.criteria;
    let qualifies = false;
    
    switch (type) {
      case 'ecoPoints':
        qualifies = user.ecoPoints >= threshold;
        break;
      case 'co2Reduced':
        qualifies = user.totalCO2Reduced >= threshold;
        break;
      case 'pickupsCompleted':
        qualifies = user.totalPickupsCompleted >= threshold;
        break;
      case 'streakDays':
        qualifies = user.streakDays >= threshold;
        break;
      case 'wasteType':
        // This would require additional query - simplified for now
        qualifies = false;
        break;
    }
    
    if (qualifies) {
      earnedBadges.push(badge._id);
    }
  }
  
  return earnedBadges;
};

const Badge = mongoose.model('Badge', badgeSchema);

export default Badge;

