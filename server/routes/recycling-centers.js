import express from 'express';
import RecyclingCenter from '../models/RecyclingCenter.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/recycling-centers
// @desc    Get all recycling centers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { city, district, isActive = true } = req.query;
    
    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (city) query['address.city'] = city;
    if (district) query['address.district'] = district;

    const centers = await RecyclingCenter.find(query)
      .populate('assignedCollectors', 'name phone')
      .sort({ 'address.city': 1, centerName: 1 });

    res.json(centers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/recycling-centers/:id
// @desc    Get recycling center by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const center = await RecyclingCenter.findById(req.params.id)
      .populate('assignedCollectors', 'name phone email');

    if (!center) {
      return res.status(404).json({ message: 'Recycling center not found' });
    }

    res.json(center);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   POST /api/recycling-centers
// @desc    Create new recycling center
// @access  Private (Admin)
router.post('/', protect, modOrAdmin, async (req, res) => {
  try {
    const {
      centerName, licenseNumber, contactPerson, phone, email,
      address, operatingHours, acceptedWasteTypes, dailyCapacity, notes
    } = req.body;

    // Check if license number exists
    const exists = await RecyclingCenter.findOne({ licenseNumber });
    if (exists) {
      return res.status(400).json({ message: 'License number already exists' });
    }

    const center = await RecyclingCenter.create({
      centerName,
      licenseNumber,
      contactPerson,
      phone,
      email,
      address,
      operatingHours,
      acceptedWasteTypes,
      dailyCapacity,
      notes,
    });

    res.status(201).json(center);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/recycling-centers/:id
// @desc    Update recycling center
// @access  Private (Admin)
router.put('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const {
      centerName, contactPerson, phone, email,
      address, operatingHours, acceptedWasteTypes, dailyCapacity,
      currentLoad, isActive, verificationStatus, notes
    } = req.body;

    const center = await RecyclingCenter.findById(req.params.id);

    if (!center) {
      return res.status(404).json({ message: 'Recycling center not found' });
    }

    if (centerName) center.centerName = centerName;
    if (contactPerson) center.contactPerson = contactPerson;
    if (phone) center.phone = phone;
    if (email) center.email = email;
    if (address) center.address = address;
    if (operatingHours) center.operatingHours = operatingHours;
    if (acceptedWasteTypes) center.acceptedWasteTypes = acceptedWasteTypes;
    if (dailyCapacity !== undefined) center.dailyCapacity = dailyCapacity;
    if (currentLoad !== undefined) center.currentLoad = currentLoad;
    if (isActive !== undefined) center.isActive = isActive;
    if (verificationStatus) center.verificationStatus = verificationStatus;
    if (notes) center.notes = notes;

    await center.save();

    res.json(center);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/recycling-centers/:id
// @desc    Delete recycling center
// @access  Private (Admin)
router.delete('/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const center = await RecyclingCenter.findById(req.params.id);

    if (!center) {
      return res.status(404).json({ message: 'Recycling center not found' });
    }

    await center.deleteOne();

    res.json({ message: 'Recycling center deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/recycling-centers/:id/assign-collector
// @desc    Assign collector to center
// @access  Private (Admin)
router.put('/:id/assign-collector', protect, modOrAdmin, async (req, res) => {
  try {
    const { collectorId, action } = req.body; // action: 'add' or 'remove'

    const center = await RecyclingCenter.findById(req.params.id);

    if (!center) {
      return res.status(404).json({ message: 'Recycling center not found' });
    }

    if (action === 'add') {
      if (!center.assignedCollectors.includes(collectorId)) {
        center.assignedCollectors.push(collectorId);
      }
    } else if (action === 'remove') {
      center.assignedCollectors = center.assignedCollectors.filter(
        c => c.toString() !== collectorId
      );
    }

    await center.save();

    res.json(center);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/recycling-centers/stats/overview
// @desc    Get recycling center stats
// @access  Private (Admin)
router.get('/stats/overview', protect, modOrAdmin, async (req, res) => {
  try {
    const total = await RecyclingCenter.countDocuments();
    const active = await RecyclingCenter.countDocuments({ isActive: true });
    const verified = await RecyclingCenter.countDocuments({ verificationStatus: 'verified' });

    const centers = await RecyclingCenter.find();
    const totalWaste = centers.reduce((sum, c) => sum + (c.totalWasteProcessed || 0), 0);
    const totalCarbon = centers.reduce((sum, c) => sum + (c.totalCarbonReduced || 0), 0);

    res.json({
      total,
      active,
      verified,
      totalWasteProcessed: totalWaste,
      totalCarbonReduced: totalCarbon,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

