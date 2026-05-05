import { Request, Response, NextFunction } from 'express';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { Pickup } from '../models/Pickup';
import { Badge } from '../models/Badge';
import { WasteLog } from '../models/WasteLog';
import { CarbonCredit } from '../models/CarbonCredit';
import { Certificate } from '../models/Certificate';
import { Business } from '../models/Business';
import { ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP, WEEKLY_MILESTONES, CARBON_CREDIT_RATES, DEFAULT_CREDIT_RATE, calcDeliveryCharge, haversineKm, checkAndAwardCollectorBadges, checkAndAwardUserBadges, checkAndAwardCenterBadges } from '../utils/helpers';

export const getMe = async (req: Request, res: Response) => {
  try {
    const center = await RecyclingCenter.findById(req.user.id);
    if (!center) return res.status(404).json({ message: "Center not found" });
    res.json(center);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const { address, phone, location } = req.body;
    const updates: any = {};
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (location?.lat && location?.lng) updates.location = location;
    const center = await RecyclingCenter.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!center) return res.status(404).json({ message: "Center not found" });
    res.json(center);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBadgeProgress = async (req: Request, res: Response) => {
  try {
    const center = await RecyclingCenter.findById(req.user.id);
    if (!center) return res.status(404).json({ message: "Center not found" });
    const allBadges = await Badge.find({ targetRole: 'recycling_center', criteria: { $ne: null } });
    const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed' });
    const completedCount = completedPickups.length;
    const totalKg = completedPickups.reduce((sum, p: any) => sum + (p.actualWeight || p.estimatedWeight || 0), 0);
    const wasteTypes = new Set(completedPickups.map((p: any) => p.wasteType));
    const wasteBreakdown = completedPickups.reduce((acc: any, p: any) => {
      acc[p.wasteType] = (acc[p.wasteType] || 0) + (p.actualWeight || p.estimatedWeight || 0);
      return acc;
    }, {});
    const progress = allBadges.map((badge) => {
      let current = 0;
      if (badge.criteria?.type === 'pickupsProcessed') current = completedCount;
      else if (badge.criteria?.type === 'totalWasteKg') current = totalKg;
      else if (badge.criteria?.type === 'wasteTypeDiversity') current = wasteTypes.size;
      const threshold = badge.criteria?.threshold || 0;
      return {
        _id: badge._id,
        badgeName: badge.badgeName,
        description: badge.description,
        iconURL: badge.iconURL,
        criteria: badge.criteria,
        current: Math.round(current),
        threshold,
        earned: center.badges.includes(badge.badgeName),
        wasteBreakdown,
        wasteTypeCount: wasteTypes.size,
        completedPickups: completedCount,
        totalKg: Math.round(totalKg),
      };
    });
    res.json(progress);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPendingPickups = async (req: Request, res: Response) => {
  try {
    const pickups = await Pickup.find({ status: 'pending' })
      .populate('userId', 'name phone location')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const acceptPickup = async (req: Request, res: Response) => {
  try {
    const pickup = await Pickup.findOne({ _id: req.params.id, status: 'pending' }).populate('userId', 'location');
    if (!pickup) return res.status(404).json({ message: "Pickup not found or already accepted" });
    const center = await RecyclingCenter.findById(req.user.id);
    if (!center?.isApproved) return res.status(403).json({ message: "Your center must be verified by an admin before you can accept pickups." });
    const userLoc = (pickup.userId as any)?.location;
    const centerLoc = center?.location;
    let charge = 60; // default minimum
    if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
      const distKm = haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng);
      charge = calcDeliveryCharge(distKm, pickup.estimatedWeight || 0);
    }
    pickup.status = 'accepted_by_center';
    pickup.centerId = req.user.id;
    pickup.deliveryCharge = charge;
    await pickup.save();
    res.json(pickup);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyPickups = async (req: Request, res: Response) => {
  try {
    const pickups = await Pickup.find({ centerId: req.user.id })
      .populate('userId', 'name phone')
      .populate('collectorId', 'name phone')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAvailableWaste = async (req: Request, res: Response) => {
  try {
    const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed' });
    const deliveredByType: Record<string, number> = {};
    for (const p of completedPickups) {
      const t = p.wasteType || 'other';
      deliveredByType[t] = (deliveredByType[t] || 0) + (p.actualWeight || p.estimatedWeight || 0);
    }
    const logs = await WasteLog.find({ centerId: req.user.id });
    const loggedByType: Record<string, number> = {};
    for (const l of logs) {
      loggedByType[l.category] = (loggedByType[l.category] || 0) + l.weight;
    }
    const available: Record<string, number> = {};
    for (const type of Object.keys(deliveredByType)) {
      const remaining = (deliveredByType[type] || 0) - (loggedByType[type] || 0);
      if (remaining > 0) available[type] = Math.round(remaining * 100) / 100;
    }
    res.json({ available, deliveredByType, loggedByType });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const logWaste = async (req: Request, res: Response) => {
  try {
    const { category, weight } = req.body;
    const center = await RecyclingCenter.findById(req.user.id);
    if (!center) return res.status(404).json({ message: "Center not found" });
    if (!center.isApproved) return res.status(403).json({ message: "Your center must be verified by an admin before logging waste." });

    // Check weight doesn't exceed what was actually delivered for this waste type
    const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed', wasteType: category });
    const totalDelivered = completedPickups.reduce((s: number, p: any) => s + (p.actualWeight || p.estimatedWeight || 0), 0);
    const alreadyLogged = await WasteLog.aggregate([
      { $match: { centerId: center._id, category } },
      { $group: { _id: null, total: { $sum: '$weight' } } }
    ]);
    const loggedSoFar = alreadyLogged[0]?.total || 0;
    const remaining = totalDelivered - loggedSoFar;
    if (weight > remaining) {
      return res.status(400).json({
        message: `Cannot log ${weight}kg — only ${remaining.toFixed(2)}kg of ${category} has been delivered to your center and not yet logged.`
      });
    }

    const rate = CARBON_CREDIT_RATES[category] ?? DEFAULT_CREDIT_RATE;
    const carbonReduced = weight * 0.8;
    const creditsEarned = Math.ceil(weight * rate);

    center.totalWasteProcessed = (center.totalWasteProcessed || 0) + weight;
    center.totalCarbonReduced = (center.totalCarbonReduced || 0) + carbonReduced;
    center.carbonCreditsBalance = (center.carbonCreditsBalance || 0) + creditsEarned;
    await center.save();

    await WasteLog.create({ centerId: req.user.id, category, weight, carbonCreditsEarned: creditsEarned });

    res.json({ center, creditsEarned, rate, message: `Logged ${weight}kg of ${category}. Earned ${creditsEarned} carbon credits (rate: ${rate}/kg)!` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listCredits = async (req: Request, res: Response) => {
  try {
    const { amount, price, source } = req.body;
    const center = await RecyclingCenter.findById(req.user.id);
    if (!center) return res.status(404).json({ message: "Center not found" });
    if (!center.isApproved) return res.status(403).json({ message: "Your center must be verified before listing credits in the marketplace." });
    if ((center.carbonCreditsBalance || 0) < amount) {
      return res.status(400).json({ message: "Insufficient carbon credits balance" });
    }
    center.carbonCreditsBalance -= amount;
    await center.save();
    const credit = await CarbonCredit.create({
      amount,
      price,
      source: source || center.centerName,
      status: 'available',
      centerId: req.user.id
    });
    res.status(201).json(credit);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const issueCertificate = async (req: Request, res: Response) => {
  try {
    const { issuedToId, issuedToType, certificateType, verifiedData } = req.body;
    const cert = await Certificate.create({
      issuedToId, issuedToType, certificateType, verifiedData,
      issueDate: new Date()
    });
    res.status(201).json(cert);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadge = async (req: Request, res: Response) => {
  try {
    const { businessId, badgeName } = req.body;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });
    if (!business.badges.includes(badgeName)) {
      business.badges.push(badgeName);
      await business.save();
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllBusinesses = async (req: Request, res: Response) => {
  try {
    const businesses = await Business.find().select('companyName email badges');
    res.json(businesses);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getWasteLogs = async (req: Request, res: Response) => {
  try {
    const logs = await WasteLog.find({ centerId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};