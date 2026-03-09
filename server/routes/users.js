import express from 'express';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin/Moderator)
router.get('/', protect, modOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({}, '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    // Get profiles for each user
    const userIds = users.map(u => u._id);
    const profiles = await Profile.find({ user_id: { $in: userIds } });

    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.user_id.toString() === user._id.toString());
      return {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        profile: profile ? {
          full_name: profile.full_name,
          user_type: profile.user_type,
          eco_points: profile.eco_points,
          co2_saved: profile.co2_saved,
          total_pickups: profile.total_pickups,
        } : null,
      };
    });

    res.json({
      users: usersWithProfiles,
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

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin/Moderator)
router.get('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = await Profile.findOne({ user_id: user._id });

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profile: profile ? {
        full_name: profile.full_name,
        user_type: profile.user_type,
        phone: profile.phone,
        address: profile.address,
        eco_points: profile.eco_points,
        co2_saved: profile.co2_saved,
        total_pickups: profile.total_pickups,
        streak_days: profile.streak_days,
      } : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/:id/role', protect, modOrAdmin, async (req, res) => {
  const { role } = req.body;

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    user.role = role || user.role;
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete associated profile
    await Profile.deleteOne({ user_id: user._id });
    
    // Delete user
    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Get user statistics
// @access  Private (Admin/Moderator)
router.get('/stats/overview', protect, modOrAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const moderatorCount = await User.countDocuments({ role: 'moderator' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    const profiles = await Profile.find();
    const totalEcoPoints = profiles.reduce((sum, p) => sum + (p.eco_points || 0), 0);
    const totalCO2Saved = profiles.reduce((sum, p) => sum + (p.co2_saved || 0), 0);
    const totalPickups = profiles.reduce((sum, p) => sum + (p.total_pickups || 0), 0);

    res.json({
      total_users: totalUsers,
      admin_count: adminCount,
      moderator_count: moderatorCount,
      regular_users: regularUsers,
      total_eco_points: totalEcoPoints,
      total_co2_saved: totalCO2Saved,
      total_pickups: totalPickups,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
