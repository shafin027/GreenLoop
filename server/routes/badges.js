import express from 'express';
import Badge from '../models/Badge.js';
import User from '../models/User.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/badges/me
// @desc    Get current user's badges
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get all badges and mark earned ones
    const allBadges = await Badge.find();
    
    const userBadges = allBadges.map(badge => ({
      _id: badge._id,
      badgeName: badge.badgeName,
      description: badge.description,
      iconURL: badge.iconURL,
      rarity: badge.rarity,
      criteria: badge.criteria,
      pointsValue: badge.pointsValue,
      earned: user.badges.includes(badge._id.toString()),
    }));

    res.json(userBadges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/badges
// @desc    Get all badges
// @access  Public
router.get('/', async (req, res) => {
  try {
    const badges = await Badge.find().sort({ rarity: 1, pointsValue: 1 });
    res.json(badges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/badges/:id
// @desc    Get badge by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json(badge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/badges/user/:userId
// @desc    Get user's earned badges
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check authorization
    if (user._id.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all badges and mark earned ones
    const allBadges = await Badge.find();
    
    const userBadges = allBadges.map(badge => ({
      ...badge.toObject(),
      earned: user.badges.includes(badge._id.toString()),
      earnedAt: user.badges.includes(badge._id.toString()) ? user.updatedAt : null,
    }));

    res.json(userBadges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   POST /api/badges
// @desc    Create new badge
// @access  Private (Admin)
router.post('/', protect, modOrAdmin, async (req, res) => {
  try {
    const { badgeName, description, iconURL, criteria, pointsValue, rarity } = req.body;

    const badge = await Badge.create({
      badgeName,
      description,
      iconURL,
      criteria,
      pointsValue: pointsValue || 0,
      rarity: rarity || 'common',
    });

    res.status(201).json(badge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/badges/:id
// @desc    Update badge
// @access  Private (Admin)
router.put('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { badgeName, description, iconURL, criteria, pointsValue, rarity } = req.body;

    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    if (badgeName) badge.badgeName = badgeName;
    if (description) badge.description = description;
    if (iconURL) badge.iconURL = iconURL;
    if (criteria) badge.criteria = criteria;
    if (pointsValue !== undefined) badge.pointsValue = pointsValue;
    if (rarity) badge.rarity = rarity;

    await badge.save();

    res.json(badge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/badges/:id
// @desc    Delete badge
// @access  Private (Admin)
router.delete('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    // Remove badge from all users
    await User.updateMany(
      { badges: req.params.id },
      { $pull: { badges: req.params.id } }
    );

    await badge.deleteOne();

    res.json({ message: 'Badge deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/badges/award/:userId
// @desc    Award badge to user manually
// @access  Private (Admin)
router.post('/award/:userId', protect, modOrAdmin, async (req, res) => {
  try {
    const { badgeId } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    // Check if already has badge
    if (user.badges.includes(badgeId)) {
      return res.status(400).json({ message: 'User already has this badge' });
    }

    user.badges.push(badgeId);
    await user.save();

    res.json({ message: 'Badge awarded successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/badges/check/:userId
// @desc    Check and auto-award badges for a user
// @access  Private (Admin)
router.post('/check/:userId', protect, modOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allBadges = await Badge.find();
    const newlyAwarded = [];

    for (const badge of allBadges) {
      const { type, threshold } = badge.criteria;
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
      }

      if (qualifies && !user.badges.includes(badge._id.toString())) {
        user.badges.push(badge._id.toString());
        newlyAwarded.push(badge);
      }
    }

    if (newlyAwarded.length > 0) {
      await user.save();
    }

    res.json({
      message: `Checked ${allBadges.length} badges`,
      newlyAwarded,
      totalBadges: user.badges.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/badges/batch-check
// @desc    Check and auto-award badges for ALL users
// @access  Private (Admin)
router.post('/batch-check', protect, modOrAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({});
    const allBadges = await Badge.find();
    
    let totalUsersChecked = 0;
    let totalNewBadgesAwarded = 0;
    const results = [];

    for (const user of allUsers) {
      const newlyAwarded = [];
      
      for (const badge of allBadges) {
        const { type, threshold } = badge.criteria;
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
        }

        if (qualifies && !user.badges.includes(badge._id.toString())) {
          user.badges.push(badge._id.toString());
          newlyAwarded.push(badge.badgeName);
        }
      }

      if (newlyAwarded.length > 0) {
        await user.save();
        totalNewBadgesAwarded += newlyAwarded.length;
        results.push({
          userId: user._id,
          userName: user.name,
          newlyAwarded,
        });
      }
      totalUsersChecked++;
    }

    res.json({
      message: 'Batch badge check completed',
      totalUsersChecked,
      totalNewBadgesAwarded,
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Seed default badges
router.post('/seed', protect, modOrAdmin, async (req, res) => {
  try {
    const defaultBadges = [
      {
        badgeName: 'First Pickup',
        description: 'Complete your first waste pickup',
        criteria: { type: 'pickupsCompleted', threshold: 1 },
        pointsValue: 50,
        rarity: 'common',
      },
      {
        badgeName: 'Recycling Rookie',
        description: 'Complete 10 pickups',
        criteria: { type: 'pickupsCompleted', threshold: 10 },
        pointsValue: 100,
        rarity: 'common',
      },
      {
        badgeName: 'Eco Warrior',
        description: 'Complete 50 pickups',
        criteria: { type: 'pickupsCompleted', threshold: 50 },
        pointsValue: 500,
        rarity: 'rare',
      },
      {
        badgeName: 'Waste Master',
        description: 'Complete 100 pickups',
        criteria: { type: 'pickupsCompleted', threshold: 100 },
        pointsValue: 1000,
        rarity: 'epic',
      },
      {
        badgeName: 'Planet Hero',
        description: 'Complete 500 pickups',
        criteria: { type: 'pickupsCompleted', threshold: 500 },
        pointsValue: 5000,
        rarity: 'legendary',
      },
      {
        badgeName: 'Point Collector',
        description: 'Earn 1000 eco-points',
        criteria: { type: 'ecoPoints', threshold: 1000 },
        pointsValue: 200,
        rarity: 'common',
      },
      {
        badgeName: 'Point Master',
        description: 'Earn 10000 eco-points',
        criteria: { type: 'ecoPoints', threshold: 10000 },
        pointsValue: 1000,
        rarity: 'rare',
      },
      {
        badgeName: 'CO2 Saver',
        description: 'Save 100kg of CO2',
        criteria: { type: 'co2Reduced', threshold: 100 },
        pointsValue: 300,
        rarity: 'rare',
      },
      {
        badgeName: 'Carbon Neutral',
        description: 'Save 1000kg of CO2',
        criteria: { type: 'co2Reduced', threshold: 1000 },
        pointsValue: 2000,
        rarity: 'epic',
      },
      {
        badgeName: 'Week Streak',
        description: '7 days of consecutive pickups',
        criteria: { type: 'streakDays', threshold: 7 },
        pointsValue: 150,
        rarity: 'common',
      },
      {
        badgeName: 'Month Master',
        description: '30 days of consecutive pickups',
        criteria: { type: 'streakDays', threshold: 30 },
        pointsValue: 500,
        rarity: 'rare',
      },
    ];

    for (const badgeData of defaultBadges) {
      await Badge.findOneAndUpdate(
        { badgeName: badgeData.badgeName },
        badgeData,
        { upsert: true, new: true }
      );
    }

    const badges = await Badge.find();
    res.json({ message: 'Badges seeded successfully', count: badges.length, badges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

