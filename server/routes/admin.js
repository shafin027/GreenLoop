import express from 'express';
import User from '../models/User.js';
import Pickup from '../models/Pickup.js';
import Event from '../models/Event.js';
import Post from '../models/Post.js';
import Issue from '../models/Issue.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin/Moderator)
router.get('/dashboard', protect, modOrAdmin, async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalCollectors = await User.countDocuments({ role: 'collector' });
    const totalAdmins = await User.countDocuments({ role: { $in: ['admin', 'moderator'] } });

    // Pickup stats
    const totalPickups = await Pickup.countDocuments();
    const completedPickups = await Pickup.countDocuments({ status: 'completed' });
    const pendingPickups = await Pickup.countDocuments({ status: { $in: ['scheduled', 'pending'] } });
    const failedPickups = await Pickup.countDocuments({ status: 'failed' });

    // Calculate totals
    const pickups = await Pickup.find({ status: 'completed' });
    const totalWeightCollected = pickups.reduce((sum, p) => sum + p.weight, 0);
    const totalPointsEarned = pickups.reduce((sum, p) => sum + p.points_earned, 0);
    const totalCO2Saved = pickups.reduce((sum, p) => sum + p.co2_saved, 0);

    // Issue stats
    const openIssues = await Issue.countDocuments({ status: 'open' });
    const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });

    // Event stats
    const activeEvents = await Event.countDocuments({ status: 'active' });
    const totalParticipants = await Event.aggregate([
      { $group: { _id: null, total: { $sum: '$participantCount' } } }
    ]);

    // Post stats
    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ isApproved: false });

    // Top collectors
    const topCollectors = await User.find({ role: 'collector' })
      .select('name totalWeightCollected totalPickupsCompleted performanceRating')
      .sort({ totalWeightCollected: -1 })
      .limit(5);

    // Recent activity
    const recentPickups = await Pickup.find()
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Weekly stats (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyPickups = await Pickup.find({
      createdAt: { $gte: weekAgo },
      status: 'completed'
    });

    const dailyStats = {};
    weeklyPickups.forEach(p => {
      const day = new Date(p.createdAt).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { pickups: 0, weight: 0, points: 0 };
      }
      dailyStats[day].pickups += 1;
      dailyStats[day].weight += p.weight;
      dailyStats[day].points += p.points_earned;
    });

    res.json({
      users: {
        total: totalUsers,
        collectors: totalCollectors,
        admins: totalAdmins,
      },
      pickups: {
        total: totalPickups,
        completed: completedPickups,
        pending: pendingPickups,
        failed: failedPickups,
        totalWeight: totalWeightCollected,
        totalPoints: totalPointsEarned,
        totalCO2: totalCO2Saved,
      },
      issues: {
        open: openIssues,
        resolved: resolvedIssues,
      },
      events: {
        active: activeEvents,
        totalParticipants: totalParticipants[0]?.total || 0,
      },
      posts: {
        total: totalPosts,
        pending: pendingPosts,
      },
      topCollectors,
      recentPickups,
      weeklyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin)
router.get('/users', protect, modOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/collectors
// @desc    Get all collectors
// @access  Private (Admin)
router.get('/collectors', protect, modOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collectors = await User.find({ role: 'collector' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ role: 'collector' });

    res.json({
      collectors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/create-collector
// @desc    Create a new collector
// @access  Private (Admin)
router.post('/create-collector', protect, modOrAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, assignedArea } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const collector = await User.create({
      name,
      email,
      password,
      phone,
      role: 'collector',
      assignedArea,
    });

    res.status(201).json({
      id: collector._id,
      name: collector.name,
      email: collector.email,
      phone: collector.phone,
      role: collector.role,
      assignedArea: collector.assignedArea,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/update-collector/:id
// @desc    Update collector
// @access  Private (Admin)
router.put('/update-collector/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { name, phone, assignedArea, performanceRating, isActive } = req.body;

    const collector = await User.findById(req.params.id);

    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({ message: 'Collector not found' });
    }

    if (name) collector.name = name;
    if (phone) collector.phone = phone;
    if (assignedArea) collector.assignedArea = assignedArea;
    if (performanceRating !== undefined) collector.performanceRating = performanceRating;

    await collector.save();

    res.json(collector);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/delete-collector/:id
// @desc    Delete collector
// @access  Private (Admin)
router.delete('/delete-collector/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const collector = await User.findById(req.params.id);

    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({ message: 'Collector not found' });
    }

    await collector.deleteOne();

    res.json({ message: 'Collector deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/update-user/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/update-user/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { name, phone, role, ecoPoints } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (ecoPoints !== undefined) user.ecoPoints = ecoPoints;

    await user.save();

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/delete-user/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/delete-user/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin account' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/pickups
// @desc    Get all pickups (admin view)
// @access  Private (Admin/Moderator)
router.get('/pickups', protect, modOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, wasteType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;
    if (wasteType) query.waste_type = wasteType;

    const pickups = await Pickup.find(query)
      .populate('userId', 'name email')
      .populate('collectorId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pickup.countDocuments(query);

    res.json({
      pickups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

