import express from 'express';
import Issue from '../models/Issue.js';
import Pickup from '../models/Pickup.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/issues
// @desc    Get current user's issues
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }

    const issues = await Issue.find(query)
      .populate('pickupId')
      .populate('collectorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Issue.countDocuments(query);

    res.json({
      issues,
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

// @route   GET /api/issues/:id
// @desc    Get issue by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('pickupId')
      .populate('userId', 'name email phone')
      .populate('collectorId', 'name email phone')
      .populate('resolvedBy', 'name');

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check if user owns this issue or is admin
    if (issue.userId._id.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/issues
// @desc    Create new issue report
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { pickupId, issueType, description, evidencePhotos } = req.body;

    // Verify pickup exists
    const pickup = await Pickup.findById(pickupId);
    if (!pickup) {
      return res.status(404).json({ message: 'Pickup not found' });
    }

    // Verify user owns the pickup
    if (pickup.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to report issue for this pickup' });
    }

    // Check if issue already exists for this pickup
    const existingIssue = await Issue.findOne({ pickupId, userId: req.user.id });
    if (existingIssue) {
      return res.status(400).json({ message: 'Issue already reported for this pickup' });
    }

    const issue = await Issue.create({
      pickupId,
      userId: req.user.id,
      collectorId: pickup.collectorId,
      issueType,
      description,
      evidencePhotos,
    });

    // Link issue to pickup
    pickup.issueReportId = issue._id;
    await pickup.save();

    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/issues/:id
// @desc    Update issue
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { description, evidencePhotos } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check if user owns this issue
    if (issue.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow update for open issues
    if (issue.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update resolved issues' });
    }

    if (description) issue.description = description;
    if (evidencePhotos) issue.evidencePhotos = evidencePhotos;

    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/issues/:id
// @desc    Delete issue
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check if user owns this issue or is admin
    if (issue.userId.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow deletion for open issues
    if (issue.status !== 'open') {
      return res.status(400).json({ message: 'Cannot delete resolved issues' });
    }

    await issue.deleteOne();

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   GET /api/issues/admin/all
// @desc    Get all issues (admin)
// @access  Private (Admin/Moderator)
router.get('/admin/all', protect, modOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const issueType = req.query.type;

    let query = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;

    const issues = await Issue.find(query)
      .populate('pickupId')
      .populate('userId', 'name email phone')
      .populate('collectorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Issue.countDocuments(query);

    // Get counts by status
    const statusCounts = await Issue.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      issues,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statusCounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/issues/admin/:id/resolve
// @desc    Resolve issue (admin)
// @access  Private (Admin/Moderator)
router.put('/admin/:id/resolve', protect, modOrAdmin, async (req, res) => {
  try {
    const { resolutionNote } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    issue.status = 'resolved';
    issue.resolutionNote = resolutionNote;
    issue.resolvedBy = req.user.id;
    issue.resolvedAt = new Date();

    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/issues/admin/:id/reject
// @desc    Reject issue (admin)
// @access  Private (Admin/Moderator)
router.put('/admin/:id/reject', protect, modOrAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    issue.status = 'rejected';
    issue.resolutionNote = rejectionReason;
    issue.resolvedBy = req.user.id;
    issue.resolvedAt = new Date();

    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/issues/admin/stats
// @desc    Get issue statistics (admin)
// @access  Private (Admin/Moderator)
router.get('/admin/stats', protect, modOrAdmin, async (req, res) => {
  try {
    const total = await Issue.countDocuments();
    const open = await Issue.countDocuments({ status: 'open' });
    const inReview = await Issue.countDocuments({ status: 'in-review' });
    const resolved = await Issue.countDocuments({ status: 'resolved' });
    const rejected = await Issue.countDocuments({ status: 'rejected' });

    // By type
    const byType = await Issue.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } }
    ]);

    res.json({
      total,
      open,
      inReview,
      resolved,
      rejected,
      byType,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

