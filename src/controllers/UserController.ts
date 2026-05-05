import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Collector } from '../models/Collector';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { Pickup } from '../models/Pickup';
import { Badge } from '../models/Badge';
import { ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP, WEEKLY_MILESTONES, CARBON_CREDIT_RATES, DEFAULT_CREDIT_RATE, calcDeliveryCharge, haversineKm } from '../utils/helpers';

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const { name, phone, location } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, location }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyPickups = async (req: Request, res: Response) => {
  try {
    const pickups = await Pickup.find({ userId: req.user.id })
      .populate('collectorId', 'name phone performanceRating totalRatings')
      .populate('centerId', 'centerName address')
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('name email ecoPoints totalCO2Reduced badges createdAt')
      .sort({ ecoPoints: -1, totalCO2Reduced: -1, name: 1 });
    const ranked = users.map((user, idx) => ({
      id: user._id,
      name: user.name || user.email,
      ecoPoints: user.ecoPoints || 0,
      totalCO2Reduced: user.totalCO2Reduced || 0,
      badges: user.badges || [],
      rank: idx + 1
    }));
    res.json(ranked);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const ratePickup = async (req: Request, res: Response) => {
  try {
    const { stars, review } = req.body;
    if (!stars || stars < 1 || stars > 5) return res.status(400).json({ message: "Stars must be 1–5" });
    const pickup = await Pickup.findOne({ _id: req.params.id, userId: req.user.id, status: 'completed' });
    if (!pickup) return res.status(404).json({ message: "Completed pickup not found" });
    if (pickup.rating?.stars) return res.status(400).json({ message: "Already rated" });
    pickup.rating = { stars, review: review || '', ratedAt: new Date() };
    await pickup.save();
    // Update collector's performance rating
    if (pickup.collectorId) {
      const collector = await Collector.findById(pickup.collectorId);
      if (collector) {
        collector.ratingSum = (collector.ratingSum || 0) + stars;
        collector.totalRatings = (collector.totalRatings || 0) + 1;
        collector.performanceRating = Math.round((collector.ratingSum / collector.totalRatings) * 10) / 10;
        await collector.save();
      }
    }
    res.json({ message: "Rating submitted successfully", pickup });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBadgeProgress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const allBadges = await Badge.find({ targetRole: { $in: ['user', 'all'] }, criteria: { $ne: null } });
    const completedPickups = await Pickup.find({ userId: req.user.id, status: 'completed' });
    const completedCount = completedPickups.length;
    const progress = await Promise.all(allBadges.map(async (badge) => {
      let current = 0;
      let threshold = badge.criteria?.threshold || 0;
      if (badge.criteria?.type === 'pickupsCompleted') current = completedCount;
      else if (badge.criteria?.type === 'ecoPoints') current = user.ecoPoints || 0;
      else if (badge.criteria?.type === 'co2Reduced') current = user.totalCO2Reduced || 0;
      else if (badge.criteria?.type === 'carbonCredits') current = user.carbonCreditsBalance || 0;
      return {
        _id: badge._id,
        badgeName: badge.badgeName,
        description: badge.description,
        iconURL: badge.iconURL,
        criteria: badge.criteria,
        current,
        threshold,
        earned: user.badges.includes(badge.badgeName),
        completedPickups: completedCount,
        wasteBreakdown: completedPickups.reduce((acc: any, p) => {
          acc[p.wasteType] = (acc[p.wasteType] || 0) + (p.actualWeight || p.estimatedWeight || 0);
          return acc;
        }, {})
      };
    }));
    res.json(progress);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const estimateCharge = async (req: Request, res: Response) => {
  try {
    const { lat, lng, weightKg = 5 } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: "Location required" });
    const centers = await RecyclingCenter.find();
    let nearest: any = null;
    let minDist = Infinity;
    for (const c of centers) {
      if (!c.location?.lat || !c.location?.lng) continue;
      const dist = haversineKm(lat, lng, c.location.lat, c.location.lng);
      if (dist < minDist) { minDist = dist; nearest = c; }
    }
    if (!nearest || minDist === Infinity) {
      const fallback = calcDeliveryCharge(0, weightKg);
      return res.json({ charge: fallback, distanceKm: 0, nearestCenter: null });
    }
    const charge = calcDeliveryCharge(minDist, weightKg);
    res.json({
      charge,
      distanceKm: parseFloat(minDist.toFixed(2)),
      nearestCenter: { name: nearest.centerName, address: nearest.address, location: nearest.location }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const claimBadge = async (req: Request, res: Response) => {
  try {
    const { badgeName } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.badges.includes(badgeName)) return res.status(400).json({ message: "Badge already claimed" });
    const badge = await Badge.findOne({ badgeName, targetRole: { $in: ['user', 'all'] } });
    if (!badge || !badge.criteria) return res.status(400).json({ message: "Badge not found or not claimable" });
    const completedPickups = await Pickup.find({ userId: req.user.id, status: 'completed' });
    const completedCount = completedPickups.length;
    let met = false;
    if (badge.criteria.type === 'pickupsCompleted' && completedCount >= badge.criteria.threshold) met = true;
    if (badge.criteria.type === 'ecoPoints' && (user.ecoPoints || 0) >= badge.criteria.threshold) met = true;
    if (badge.criteria.type === 'co2Reduced' && (user.totalCO2Reduced || 0) >= badge.criteria.threshold) met = true;
    if (badge.criteria.type === 'carbonCredits' && (user.carbonCreditsBalance || 0) >= badge.criteria.threshold) met = true;
    if (!met) return res.status(400).json({ message: "You have not met the criteria for this badge yet. Only completed pickups (collected by a collector) count towards your progress." });
    user.badges.push(badgeName);
    await user.save();
    res.json({ message: `Badge "${badgeName}" claimed successfully!`, badges: user.badges });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const redeemReward = async (req: Request, res: Response) => {
  try {
    const { rewardId, rewardTitle, pointsCost } = req.body;
    if (!rewardTitle || !pointsCost || pointsCost <= 0) {
      return res.status(400).json({ message: "Invalid reward data" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user.ecoPoints || 0) < pointsCost) {
      return res.status(400).json({ message: "Insufficient eco-points" });
    }
    user.ecoPoints = (user.ecoPoints || 0) - pointsCost;
    user.redeemedRewards.push({ rewardId, rewardTitle, pointsCost, redeemedAt: new Date() });
    await user.save();
    res.json({
      message: `"${rewardTitle}" redeemed successfully!`,
      ecoPoints: user.ecoPoints
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getRedeemedRewards = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select('redeemedRewards');
    if (!user) return res.status(404).json({ message: "User not found" });
    const history = [...(user.redeemedRewards || [])].sort(
      (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
    );
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const schedulePickup = async (req: Request, res: Response) => {
  try {
    const { location, ...pickupData } = req.body;
    if (location?.lat && location?.lng) {
      await User.findByIdAndUpdate(req.user.id, { location });
    }
    const pickup = await Pickup.create({
      ...pickupData,
      userId: req.user.id,
      status: 'pending'
    });
    res.status(201).json(pickup);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};