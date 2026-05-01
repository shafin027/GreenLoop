import { Request, Response } from 'express';
import { Collector } from '../models/Collector';
import { Pickup } from '../models/Pickup';
import { EarningsHistory } from '../models/EarningsHistory';
import { User } from '../models/User';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { FraudLog } from '../models/FraudLog';
import { checkAndAwardCollectorBadges, checkAndAwardCenterBadges } from '../utils/badgeService';
import { calcDeliveryCharge, haversineKm, WEEKLY_MILESTONES, checkWeekReset, ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP } from '../utils/helpers';

export class CollectorController {
  static async getProfile(req: Request, res: Response) {
    try {
      const collector = await Collector.findById(req.user?.id);
      if (!collector) return res.status(404).json({ message: 'Collector not found' });
      res.json(collector);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });
      await Collector.findByIdAndUpdate(req.user?.id, { currentLocation: { lat, lng, updatedAt: new Date() } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAvailablePickups(req: Request, res: Response) {
    try {
      const pickups = await Pickup.find({ status: 'accepted_by_center', collectorId: null })
        .populate('userId', 'name phone location')
        .populate('centerId', 'centerName address location')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAssignedPickups(req: Request, res: Response) {
    try {
      const pickups = await Pickup.find({ collectorId: req.user?.id, status: { $nin: ['completed', 'failed'] } })
        .populate('userId', 'name phone location')
        .populate('centerId', 'centerName address location')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const pickups = await Pickup.find({ collectorId: req.user?.id, status: { $in: ['completed', 'failed'] } })
        .populate('userId', 'name phone')
        .populate('centerId', 'centerName address')
        .sort({ completedAt: -1, createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async assignPickup(req: Request, res: Response) {
    try {
      const pickup = await Pickup.findOneAndUpdate(
        { _id: req.params.id, status: 'accepted_by_center', collectorId: null },
        { status: 'accepted_by_collector', collectorId: req.user?.id },
        { new: true }
      );
      if (!pickup) return res.status(404).json({ message: 'Pickup not available' });
      res.json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updatePickupStatus(req: Request, res: Response) {
    try {
      const { status, actualWeight, completionPhoto } = req.body;
      const pickup = await Pickup.findOne({ _id: req.params.id, collectorId: req.user?.id });
      if (!pickup) return res.status(404).json({ message: 'Pickup not found' });

      if (status === 'completed') {
        if (!completionPhoto) return res.status(400).json({ message: 'Completion photo is required to complete a pickup' });

        const weight = actualWeight || pickup.estimatedWeight;
        const co2Reduced = weight * 0.8;
        const ecoPoints = Math.floor(weight * ECO_POINTS_RATE);

        let finalCharge = pickup.deliveryCharge || 60;
        if (pickup.centerId) {
          const center = await RecyclingCenter.findById(pickup.centerId);
          const userDoc = await User.findById(pickup.userId);
          const userLoc = userDoc?.location;
          const centerLoc = center?.location;
          if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
            const distKm = haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng);
            finalCharge = calcDeliveryCharge(distKm, weight);
          } else {
            finalCharge = calcDeliveryCharge(0, weight);
          }
        }

        pickup.status = 'completed';
        pickup.actualWeight = weight;
        pickup.co2Reduced = co2Reduced;
        pickup.ecoPointsEarned = ecoPoints;
        pickup.completionPhoto = completionPhoto;
        pickup.completedAt = new Date();
        pickup.deliveryCharge = finalCharge;
        pickup.deliveryProofImages = pickup.deliveryProofImages || [];
        if (!pickup.deliveryProofImages.includes(completionPhoto)) {
          pickup.deliveryProofImages.push(completionPhoto);
        }
        await pickup.save();

        let collector = await Collector.findById(req.user?.id);
        if (collector) {
          collector = await checkWeekReset(collector);
          collector.totalPickups = (collector.totalPickups || 0) + 1;
          collector.totalWeightCollected = (collector.totalWeightCollected || 0) + weight;
          const baseCharge = finalCharge;
          collector.totalEarnings = (collector.totalEarnings || 0) + baseCharge;
          collector.weeklyPickups = (collector.weeklyPickups || 0) + 1;
          collector.weeklyEarnings = (collector.weeklyEarnings || 0) + baseCharge;

          let bonusEarned = 0;
          for (const milestone of WEEKLY_MILESTONES) {
            const prevPickups = collector.weeklyPickups - 1;
            if (prevPickups < milestone.pickups && collector.weeklyPickups >= milestone.pickups) {
              bonusEarned += milestone.bonus;
            }
          }
          if (bonusEarned > 0) {
            collector.weeklyBonusEarned = (collector.weeklyBonusEarned || 0) + bonusEarned;
            collector.totalEarnings = (collector.totalEarnings || 0) + bonusEarned;
          }
          await collector.save();

          const today = new Date();
          const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
          const existing = await EarningsHistory.findOne({
            collectorId: req.user?.id,
            day: dayName,
            createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
          });
          if (existing) {
            existing.earnings += baseCharge + bonusEarned;
            existing.pickups += 1;
            existing.bonus += bonusEarned;
            await existing.save();
          } else {
            await EarningsHistory.create({
              collectorId: req.user?.id,
              day: dayName,
              earnings: baseCharge + bonusEarned,
              pickups: 1,
              bonus: bonusEarned
            });
          }

          await checkAndAwardCollectorBadges(req.user?.id || '');
        }

        const user = await User.findById(pickup.userId);
        if (user) {
          user.carbonCreditsBalance = (user.carbonCreditsBalance || 0) + USER_CREDITS_PER_PICKUP;
          user.ecoPoints = (user.ecoPoints || 0) + ecoPoints;
          user.totalCO2Reduced = (user.totalCO2Reduced || 0) + co2Reduced;
          await user.save();
        }

        if (pickup.centerId) {
          await checkAndAwardCenterBadges(pickup.centerId.toString());
        }

        const estimatedW = pickup.estimatedWeight || 0;
        const mismatchPct = estimatedW > 0 ? Math.abs(weight - estimatedW) / estimatedW : 0;
        const mismatchKg = Math.abs(weight - estimatedW);
        const isMismatch = mismatchPct > 0.10 && mismatchKg > 0.5;
        const isAnomalous = weight > 50;
        if (isMismatch || isAnomalous) {
          const existingFraud = await FraudLog.findOne({ pickupId: pickup._id });
          if (!existingFraud) {
            let reason: string;
            let severity: string;
            if (isMismatch && isAnomalous) {
              reason = `Weight anomaly + mismatch: estimated ${estimatedW}kg, actual ${weight}kg (${Math.round(mismatchPct * 100)}% difference, exceeds 50kg threshold)`;
              severity = 'critical';
            } else if (isMismatch) {
              reason = `Weight mismatch: estimated ${estimatedW}kg, actual ${weight}kg (${Math.round(mismatchPct * 100)}% difference — exceeds 10% tolerance)`;
              severity = mismatchPct > 0.5 ? 'critical' : mismatchPct > 0.25 ? 'high' : 'medium';
            } else {
              reason = `Unusual weight entry: ${weight}kg exceeds threshold of 50kg`;
              severity = weight > 100 ? 'critical' : 'high';
            }
            await FraudLog.create({ collectorId: req.user?.id, pickupId: pickup._id, reason, severity, resolved: false });
          }
        }

        return res.json({ message: 'Pickup completed successfully', pickup });
      }

      pickup.status = status;
      await pickup.save();
      res.json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getEarningsChart(req: Request, res: Response) {
    try {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        last7Days.push({ date: d, day: days[d.getDay()] });
      }

      const earningsData = await Promise.all(last7Days.map(async ({ date, day }) => {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        const record = await EarningsHistory.findOne({
          collectorId: req.user?.id,
          createdAt: { $gte: start, $lt: end }
        });
        return {
          day,
          earnings: record?.earnings || 0,
          pickups: record?.pickups || 0,
          bonus: record?.bonus || 0
        };
      }));

      res.json(earningsData);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getRankings(req: Request, res: Response) {
    try {
      const collectors = await Collector.find()
        .select('name totalWeightCollected totalPickups performanceRating totalEarnings verified')
        .sort({ totalPickups: -1 });
      res.json(collectors);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAllCollectors(req: Request, res: Response) {
    try {
      const collectors = await Collector.find().select('name email totalPickups totalEarnings verified badges weeklyPickups isBanned');
      res.json(collectors);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

