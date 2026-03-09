import express from 'express';
import User from '../models/User.js';
import Pickup from '../models/Pickup.js';
import { protect, collectorOnly, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/collectors/me
// @desc    Get current collector profile
// @access  Private (Collector)
router.get('/me', protect, async (req, res) => {
  try {
    const collector = await User.findOne({
      _id: req.user.id,
      role: 'collector'
    });

    if (!collector) {
      return res.status(404).json({ message: 'Collector not found' });
    }

    res.json({
      id: collector._id,
      name: collector.name,
      email: collector.email,
      phone: collector.phone,
      role: collector.role,
      assignedArea: collector.assignedArea,
      totalWeightCollected: collector.totalWeightCollected,
      totalPickupsCompleted: collector.totalPickupsCompleted,
      performanceRating: collector.performanceRating,
      ecoPoints: collector.ecoPoints,
      totalCO2Reduced: collector.totalCO2Reduced,
      createdAt: collector.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/collectors/assigned-pickups
// @desc    Get assigned pickups for collector
// @access  Private (Collector)
router.get('/assigned-pickups', protect, async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let query = {
      collectorId: req.user.id,
    };

    if (status) {
      query.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.pickupDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const pickups = await Pickup.find(query)
      .populate('userId', 'name email phone')
      .sort({ pickupDate: 1, pickup_time: 1 });

    res.json(pickups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/collectors/performance
// @desc    Get collector performance metrics
// @access  Private (Collector)
router.get('/performance', protect, async (req, res) => {
  try {
    const collector = await User.findById(req.user.id);
    
    // Get completed pickups count
    const totalCompleted = await Pickup.countDocuments({
      collectorId: req.user.id,
      status: 'completed',
    });

    // Get pickups by status
    const pendingCount = await Pickup.countDocuments({
      collectorId: req.user.id,
      status: 'pending',
    });

    const scheduledCount = await Pickup.countDocuments({
      collectorId: req.user.id,
      status: 'scheduled',
    });

    // Get weekly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyPickups = await Pickup.find({
      collectorId: req.user.id,
      status: 'completed',
      createdAt: { $gte: weekAgo },
    });

    // Group by day
    const dailyStats = {};
    weeklyPickups.forEach(p => {
      const day = new Date(p.createdAt).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { count: 0, weight: 0, points: 0 };
      }
      dailyStats[day].count += 1;
      dailyStats[day].weight += p.weight;
      dailyStats[day].points += p.points_earned;
    });

    // Monthly stats
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyPickups = await Pickup.find({
      collectorId: req.user.id,
      status: 'completed',
      createdAt: { $gte: monthAgo },
    });

    const monthlyWeight = monthlyPickups.reduce((sum, p) => sum + p.weight, 0);
    const monthlyPoints = monthlyPickups.reduce((sum, p) => sum + p.points_earned, 0);

    res.json({
      totalWeightCollected: collector.totalWeightCollected || 0,
      totalPickupsCompleted: totalCompleted,
      performanceRating: collector.performanceRating || 0,
      ecoPoints: collector.ecoPoints || 0,
      pendingPickups: pendingCount,
      scheduledPickups: scheduledCount,
      monthlyWeight,
      monthlyPoints,
      weeklyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/collectors/me
// @desc    Update collector profile
// @access  Private (Collector)
router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone, assignedArea } = req.body;

    const collector = await User.findById(req.user.id);

    if (!collector) {
      return res.status(404).json({ message: 'Collector not found' });
    }

    if (name) collector.name = name;
    if (phone) collector.phone = phone;
    if (assignedArea) collector.assignedArea = assignedArea;

    await collector.save();

    res.json({
      id: collector._id,
      name: collector.name,
      email: collector.email,
      phone: collector.phone,
      assignedArea: collector.assignedArea,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/collectors/pickup/update-status/:pickupId
// @desc    Update pickup status
// @access  Private (Collector)
router.post('/pickup/update-status/:pickupId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'on-the-way', 'arrived', 'completed', 'failed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pickup = await Pickup.findById(req.params.pickupId);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if collector is assigned to this pickup
    if (pickup.collectorId && pickup.collectorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not assigned to this pickup' });
    }

    pickup.status = status;
    
    if (status === 'completed') {
      pickup.collected_at = new Date();
    }

    await pickup.save();

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/collectors/pickup/submit-weight/:pickupId
// @desc    Submit actual weight for pickup
// @access  Private (Collector)
router.post('/pickup/submit-weight/:pickupId', protect, async (req, res) => {
  try {
    const { actualWeight, notes } = req.body;

    if (!actualWeight || actualWeight <= 0) {
      return res.status(400).json({ message: 'Valid weight is required' });
    }

    const pickup = await Pickup.findById(req.params.pickupId);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if collector is assigned
    if (pickup.collectorId && pickup.collectorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not assigned to this pickup' });
    }

    // Update weight
    pickup.weight = actualWeight;
    if (notes) pickup.notes = notes;

    // Recalculate points and CO2
    const pointsPerKg = {
      plastic: 20, paper: 10, glass: 30, metal: 25,
      e_waste: 100, organic: 5, ewaste: 100, other: 15
    };
    const co2PerKg = {
      plastic: 6.0, paper: 3.5, glass: 1.5, metal: 8.0,
      e_waste: 15.0, organic: 2.0, ewaste: 15.0, other: 4.0
    };

    const type = pickup.waste_type;
    pickup.points_earned = Math.round((pointsPerKg[type] || 10) * actualWeight);
    pickup.co2_saved = parseFloat(((co2PerKg[type] || 4) * actualWeight).toFixed(2));

    await pickup.save();

    // Update user stats if pickup is completed
    if (pickup.status === 'completed') {
      const user = await User.findById(pickup.user_id);
      if (user) {
        user.ecoPoints += pickup.points_earned;
        user.totalCO2Reduced += pickup.co2_saved;
        user.totalPickupsCompleted += 1;
        await user.save();
      }

      // Update collector stats
      const collector = await User.findById(req.user.id);
      if (collector) {
        collector.totalWeightCollected = (collector.totalWeightCollected || 0) + actualWeight;
        collector.totalPickupsCompleted += 1;
        
        // Recalculate performance rating
        const totalPickups = collector.totalPickupsCompleted;
        const completedRatio = totalPickups > 0 ? 1 : 0; // Simplified
        collector.performanceRating = Math.min(5, 4 + (completedRatio * 0.5));
        
        await collector.save();
      }
    }

    res.json(pickup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/collectors/pickup/upload-proof/:pickupId
// @desc    Upload photo proof for pickup
// @access  Private (Collector)
router.post('/pickup/upload-proof/:pickupId', protect, async (req, res) => {
  try {
    const { proofImage } = req.body; // Base64 or URL

    const pickup = await Pickup.findById(req.params.pickupId);

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Check if collector is assigned
    if (pickup.collectorId && pickup.collectorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not assigned to this pickup' });
    }

    // Store proof (in real app, upload to cloud storage)
    pickup.proofImage = proofImage;
    await pickup.save();

    res.json({ message: 'Proof uploaded successfully', pickup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   GET /api/collectors
// @desc    Get all collectors (admin)
// @access  Private (Admin/Moderator)
router.get('/', protect, modOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collectors = await User.find({ role: 'collector' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'collector' });

    res.json({
      collectors,
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

// @route   POST /api/collectors
// @desc    Create new collector (admin)
// @access  Private (Admin)
router.post('/', protect, modOrAdmin, async (req, res) => {
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

// @route   PUT /api/collectors/:id
// @desc    Update collector (admin)
// @access  Private (Admin)
router.put('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { name, phone, assignedArea, isActive, performanceRating } = req.body;

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

// @route   DELETE /api/collectors/:id
// @desc    Delete collector (admin)
// @access  Private (Admin)
router.delete('/:id', protect, modOrAdmin, async (req, res) => {
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

export default router;

