import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Pickup from '../models/Pickup.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/events/me
// @desc    Get current user's events
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const events = await Event.find({
      participants: req.user.id,
    })
      .populate('organizedBy', 'name')
      .sort({ startDate: -1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const events = await Event.find(query)
      .populate('organizedBy', 'name')
      .populate('participants', 'name')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      events,
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

// @route   GET /api/events/active
// @desc    Get active events
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    
    const events = await Event.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('organizedBy', 'name')
      .sort({ endDate: 1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizedBy', 'name')
      .populate('participants', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/join
// @desc    Join an event
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already joined
    if (event.participants.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already joined this event' });
    }

    // Check max participants
    if (event.maxParticipants && event.participantCount >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }

    event.participants.push(req.user.id);
    await event.save();

    res.json({ message: 'Successfully joined event', event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/leave
// @desc    Leave an event
// @access  Private
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if joined
    const index = event.participants.indexOf(req.user.id);
    if (index === -1) {
      return res.status(400).json({ message: 'Not joined this event' });
    }

    event.participants.splice(index, 1);
    await event.save();

    res.json({ message: 'Successfully left event', event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin/Moderator)
router.post('/', protect, modOrAdmin, async (req, res) => {
  try {
    const {
      title, description, type, location, startDate, endDate,
      imageURL, rewardMultiplier, rewardPoints, maxParticipants,
      targetWeight, targetParticipants, status
    } = req.body;

    const event = await Event.create({
      title,
      description,
      type,
      location,
      startDate,
      endDate,
      imageURL,
      rewardMultiplier: rewardMultiplier || 1,
      rewardPoints: rewardPoints || 0,
      maxParticipants,
      targetWeight,
      targetParticipants,
      status: status || 'draft',
      organizedBy: req.user.id,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin/Moderator)
router.put('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const {
      title, description, type, location, startDate, endDate,
      imageURL, rewardMultiplier, rewardPoints, maxParticipants,
      targetWeight, targetParticipants, status
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (type) event.type = type;
    if (location) event.location = location;
    if (startDate) event.startDate = startDate;
    if (endDate) event.endDate = endDate;
    if (imageURL) event.imageURL = imageURL;
    if (rewardMultiplier !== undefined) event.rewardMultiplier = rewardMultiplier;
    if (rewardPoints !== undefined) event.rewardPoints = rewardPoints;
    if (maxParticipants !== undefined) event.maxParticipants = maxParticipants;
    if (targetWeight !== undefined) event.targetWeight = targetWeight;
    if (targetParticipants !== undefined) event.targetParticipants = targetParticipants;
    if (status) event.status = status;

    await event.save();

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Admin)
router.delete('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.deleteOne();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/admin/stats
// @desc    Get event statistics
// @access  Private (Admin/Moderator)
router.get('/admin/stats', protect, modOrAdmin, async (req, res) => {
  try {
    const total = await Event.countDocuments();
    const active = await Event.countDocuments({ status: 'active' });
    const completed = await Event.countDocuments({ status: 'completed' });
    const draft = await Event.countDocuments({ status: 'draft' });

    const byType = await Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const totalParticipants = await Event.aggregate([
      { $group: { _id: null, total: { $sum: '$participantCount' } } }
    ]);

    res.json({
      total,
      active,
      completed,
      draft,
      byType,
      totalParticipants: totalParticipants[0]?.total || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

