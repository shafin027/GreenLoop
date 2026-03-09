import express from 'express';
import Pickup from '../models/Pickup.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/pickups
// @desc    Get all pickups for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = { user_id: req.user.id };
    if (status) {
      query.status = status;
    }

    const pickups = await Pickup.find(query)
      .sort({ pickup_date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pickup.countDocuments(query);

    res.json({
      pickups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pickups/scheduled
// @desc    Get scheduled pickups for current user
// @access  Private
router.get('/scheduled', protect, async (req, res) => {
  try {
    const pickups = await Pickup.find({
      user_id: req.user.id,
      status: { $in: ['scheduled', 'pending'] },
    }).sort({ pickup_date: 1 });

    res.json(pickups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pickups/stats
// @desc    Get pickup statistics for current user
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user_id: req.user.id });
    
    const completedPickups = await Pickup.countDocuments({
      user_id: req.user.id,
      status: 'completed',
    });

    const scheduledPickups = await Pickup.countDocuments({
      user_id: req.user.id,
      status: { $in: ['scheduled', 'pending'] },
    });

    const recentPickups = await Pickup.find({
      user_id: req.user.id,
      status: 'completed',
    })
      .sort({ pickup_date: -1 })
      .limit(5);

    res.json({
      eco_points: profile?.eco_points || 0,
      co2_saved: profile?.co2_saved || 0,
      total_pickups: profile?.total_pickups || 0,
      completed_pickups: completedPickups,
      scheduled_pickups: scheduledPickups,
      streak_days: profile?.streak_days || 0,
      recent_pickups: recentPickups,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/pickups
// @desc    Create a new pickup request
// @access  Private
router.post('/', protect, async (req, res) => {
  const { waste_type, weight, pickup_date, pickup_time, address, notes } = req.body;

  try {
    // Get or create profile
    let profile = await Profile.findOne({ user_id: req.user.id });
    
    if (!profile) {
      profile = await Profile.create({ user_id: req.user.id });
    }

    const pickup = await Pickup.create({
      user_id: req.user.id,
      profile_id: profile._id,
      waste_type,
      weight,
      pickup_date,
      pickup_time,
      address: address || profile.address,
      notes,
      status: 'scheduled',
    });

    res.status(201).json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pickups/:id
// @desc    Get pickup by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if user owns this pickup or is admin/moderator
    if (pickup.user_id.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pickups/:id
// @desc    Update pickup
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if user owns this pickup or is admin/moderator
    if (pickup.user_id.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { pickup_date, pickup_time, address, notes, status } = req.body;

    if (pickup_date) pickup.pickup_date = pickup_date;
    if (pickup_time) pickup.pickup_time = pickup_time;
    if (address) pickup.address = address;
    if (notes) pickup.notes = notes;
    if (status && ['admin', 'moderator'].includes(req.user.role)) pickup.status = status;

    await pickup.save();

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/pickups/:id
// @desc    Cancel/delete pickup
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if user owns this pickup or is admin/moderator
    if (pickup.user_id.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow cancellation for scheduled/pending pickups
    if (pickup.status === 'completed') {
      return res.status(400).json({ message: 'Cannot delete completed pickups' });
    }

    await pickup.deleteOne();

    res.json({ message: 'Pickup cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pickups/pending
// @desc    Get all pending pickup requests (for recycling centers/admins)
// @access  Private (Admin/Moderator)
router.get('/pending', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const pickups = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
    })
      .populate('user_id', 'name email phone')
      .populate('collector_id', 'name phone')
      .sort({ pickup_date: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pickup.countDocuments({
      status: { $in: ['scheduled', 'pending'] },
    });

    res.json({
      pickups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pickups/:id/accept
// @desc    Accept/approve a pickup request (recycling center or admin)
// @access  Private (Admin/Moderator)
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Only allow accepting scheduled/pending pickups
    if (!['scheduled', 'pending'].includes(pickup.status)) {
      return res.status(400).json({ message: 'Pickup cannot be accepted in current status' });
    }

    // Check if user is admin/moderator or has appropriate role
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to accept pickups' });
    }

    pickup.status = 'pending';
    pickup.acceptedBy = req.user.id;
    pickup.acceptedAt = new Date();
    await pickup.save();

    res.json({ message: 'Pickup accepted successfully', pickup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pickups/:id/assign-collector
// @desc    Assign a collector to a pickup
// @access  Private (Admin/Moderator)
router.put('/:id/assign-collector', protect, async (req, res) => {
  try {
    const { collectorId } = req.body;

    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if user is admin/moderator
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to assign collectors' });
    }

    // Verify collector exists and has collector role
    const collector = await User.findOne({ _id: collectorId, role: 'collector' });
    if (!collector) {
      return res.status(404).json({ message: 'Collector not found' });
    }

    pickup.collector_id = collectorId;
    pickup.status = 'scheduled';
    await pickup.save();

    res.json({ 
      message: 'Collector assigned successfully', 
      pickup,
      collector: {
        id: collector._id,
        name: collector.name,
        phone: collector.phone,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   GET /api/pickups/admin/all
// @desc    Get all pickups (admin/moderator)
// @access  Private (Admin/Moderator)
router.get('/admin/all', protect, modOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = {};
    if (status) {
      query.status = status;
    }

    const pickups = await Pickup.find(query)
      .populate('user_id', 'email')
      .populate('profile_id', 'full_name')
      .sort({ pickup_date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pickup.countDocuments(query);

    res.json({
      pickups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pickups/admin/:id/complete
// @desc    Mark pickup as completed (admin/moderator)
// @access  Private (Admin/Moderator)
router.put('/admin/:id/complete', protect, modOrAdmin, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    pickup.status = 'completed';
    pickup.collected_at = new Date();
    pickup.collector_id = req.user.id;
    await pickup.save();

    // Update profile stats
    const profile = await Profile.findById(pickup.profile_id);
    if (profile) {
      profile.eco_points += pickup.points_earned;
      profile.co2_saved += pickup.co2_saved;
      profile.total_pickups += 1;
      await profile.save();
    }

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pickups/admin/:id/fraud
// @desc    Mark pickup as fraudulent
// @access  Private (Admin/Moderator)
router.put('/admin/:id/fraud', protect, modOrAdmin, async (req, res) => {
  const { reason } = req.body;

  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    pickup.is_fraudulent = true;
    pickup.fraud_reason = reason;
    pickup.status = 'cancelled';
    await pickup.save();

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pickups/admin/stats
// @desc    Get pickup statistics (admin)
// @access  Private (Admin/Moderator)
router.get('/admin/stats', protect, modOrAdmin, async (req, res) => {
  try {
    const totalPickups = await Pickup.countDocuments();
    const completedPickups = await Pickup.countDocuments({ status: 'completed' });
    const scheduledPickups = await Pickup.countDocuments({ status: { $in: ['scheduled', 'pending'] } });
    const fraudulentPickups = await Pickup.countDocuments({ is_fraudulent: true });

    // Get stats by waste type
    const wasteTypeStats = await Pickup.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$waste_type',
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' },
          totalPoints: { $sum: '$points_earned' },
          totalCO2: { $sum: '$co2_saved' },
        },
      },
    ]);

    // Get daily stats for the past week
    const weeklyStats = await Pickup.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          pickups: { $sum: 1 },
          users: { $addToSet: '$user_id' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      total_pickups: totalPickups,
      completed_pickups: completedPickups,
      scheduled_pickups: scheduledPickups,
      fraudulent_pickups: fraudulentPickups,
      waste_type_stats: wasteTypeStats,
      weekly_stats: weeklyStats.map(w => ({
        date: w._id,
        pickups: w.pickups,
        users: w.users.length,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
