import express from 'express';
import FraudLog from '../models/FraudLog.js';
import Pickup from '../models/Pickup.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/fraud-logs
// @desc    Get fraud logs (admin)
// @access  Private (Admin/Moderator)
router.get('/', protect, modOrAdmin, async (req, res) => {
  try {
    const { severity, status, collectorId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (collectorId) query.collectorId = collectorId;

    const logs = await FraudLog.find(query)
      .populate('collectorId', 'name email')
      .populate('userId', 'name email')
      .populate('pickupId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FraudLog.countDocuments(query);

    res.json({
      logs,
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

// @route   GET /api/fraud-logs/:id
// @desc    Get fraud log by ID
// @access  Private (Admin/Moderator)
router.get('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const log = await FraudLog.findById(req.params.id)
      .populate('collectorId', 'name email phone')
      .populate('userId', 'name email phone')
      .populate('pickupId')
      .populate('resolvedBy', 'name');

    if (!log) {
      return res.status(404).json({ message: 'Fraud log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fraud-logs/collector/:collectorId
// @desc    Get fraud logs for a collector
// @access  Private (Admin/Moderator)
router.get('/collector/:collectorId', protect, modOrAdmin, async (req, res) => {
  try {
    const logs = await FraudLog.find({ collectorId: req.params.collectorId })
      .populate('pickupId')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fraud-logs/pickup/:pickupId
// @desc    Get fraud logs for a pickup
// @access  Private (Admin/Moderator)
router.get('/pickup/:pickupId', protect, modOrAdmin, async (req, res) => {
  try {
    const logs = await FraudLog.find({ pickupId: req.params.pickupId })
      .populate('collectorId', 'name email')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/fraud-logs/resolve/:id
// @desc    Resolve fraud log
// @access  Private (Admin/Moderator)
router.put('/resolve/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { resolutionNote, actionTaken } = req.body;

    const log = await FraudLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Fraud log not found' });
    }

    log.resolved = true;
    log.status = 'resolved';
    log.resolutionNote = resolutionNote;
    log.actionTaken = actionTaken;
    log.resolvedBy = req.user.id;
    log.resolvedAt = new Date();

    await log.save();

    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fraud-logs/stats
// @desc    Get fraud statistics
// @access  Private (Admin/Moderator)
router.get('/stats', protect, modOrAdmin, async (req, res) => {
  try {
    const total = await FraudLog.countDocuments();
    const resolved = await FraudLog.countDocuments({ resolved: true });
    const unresolved = await FraudLog.countDocuments({ resolved: false });

    // By severity
    const bySeverity = await FraudLog.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // By type
    const byType = await FraudLog.aggregate([
      { $group: { _id: '$alertType', count: { $sum: 1 } } }
    ]);

    // By status
    const byStatus = await FraudLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent high severity
    const highSeverityCount = await FraudLog.countDocuments({ 
      severity: { $in: ['high', 'critical'] },
      resolved: false 
    });

    res.json({
      total,
      resolved,
      unresolved,
      bySeverity,
      byType,
      byStatus,
      highSeverityCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/fraud-logs/detect
// @desc    Auto-detect fraud for a pickup
// @access  Private (Admin/System)
router.post('/detect', protect, modOrAdmin, async (req, res) => {
  try {
    const { pickupId } = req.body;

    const pickup = await Pickup.findById(pickupId)
      .populate('userId', 'name email');

    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    const alerts = [];

    // Check 1: Unrealistic weight (>100kg)
    if (pickup.weight > 100) {
      alerts.push({
        pickupId: pickup._id,
        collectorId: pickup.collectorId,
        userId: pickup.user_id,
        alertType: 'weight-anomaly',
        description: `Unusually high weight recorded: ${pickup.weight}kg`,
        severity: pickup.weight > 500 ? 'critical' : 'high',
        evidence: {
          reportedWeight: pickup.weight,
          expectedWeight: 50,
          anomalyScore: pickup.weight / 50,
        },
      });
    }

    // Check 2: Check collector's recent pickups
    if (pickup.collectorId) {
      const recentCount = await Pickup.countDocuments({
        collectorId: pickup.collectorId,
        collected_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      });

      if (recentCount > 10) {
        alerts.push({
          pickupId: pickup._id,
          collectorId: pickup.collectorId,
          userId: pickup.user_id,
          alertType: 'impossible-count',
          description: `Too many pickups in last hour: ${recentCount}`,
          severity: 'high',
          evidence: {
            count: recentCount,
            timeWindow: '1 hour',
          },
        });
      }
    }

    // Create fraud logs for all alerts
    const createdLogs = await FraudLog.insertMany(alerts);

    res.json({
      message: `Detected ${alerts.length} potential fraud issues`,
      alerts: createdLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

