import { Request, Response } from 'express';
import { db } from '../db';
import { collectors, pickups, earningsHistory, users, recyclingCenters, fraudLogs } from '../schema';
import { eq, desc, and, isNull, inArray, notInArray, gte, lt } from 'drizzle-orm';
import { checkAndAwardCollectorBadges, checkAndAwardCenterBadges } from '../utils/badgeService';
import { calcDeliveryCharge, haversineKm, WEEKLY_MILESTONES, checkWeekReset, ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP } from '../utils/helpers';

export class CollectorController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const collectorRes = await db.select().from(collectors).where(eq(collectors.id, (req as any).user?.id)).limit(1);
      const collector = collectorRes[0];
      if (!collector) {
        res.status(404).json({ message: 'Collector not found' });
        return;
      }
      res.json(collector);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) {
        res.status(400).json({ message: 'lat and lng required' });
        return;
      }
      await db.update(collectors).set({
        currentLocation: { lat, lng, updatedAt: new Date().toISOString() }
      }).where(eq(collectors.id, (req as any).user?.id));
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAvailablePickups(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select({
        pickup: pickups,
        user: {
          name: users.name,
          phone: users.phone,
          location: users.location
        },
        center: {
          centerName: recyclingCenters.centerName,
          address: recyclingCenters.address,
          location: recyclingCenters.location
        }
      })
      .from(pickups)
      .leftJoin(users, eq(pickups.userId, users.id))
      .leftJoin(recyclingCenters, eq(pickups.centerId, recyclingCenters.id))
      .where(and(eq(pickups.status, 'accepted_by_center'), isNull(pickups.collectorId)))
      .orderBy(desc(pickups.createdAt));

      const mapped = result.map(row => ({
        ...row.pickup,
        _id: row.pickup.id,
        userId: row.user ? { id: row.pickup.userId, _id: row.pickup.userId, ...row.user } : null,
        centerId: row.center ? { id: row.pickup.centerId, _id: row.pickup.centerId, ...row.center } : null
      }));
      res.json(mapped);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAssignedPickups(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select({
        pickup: pickups,
        user: {
          name: users.name,
          phone: users.phone,
          location: users.location
        },
        center: {
          centerName: recyclingCenters.centerName,
          address: recyclingCenters.address,
          location: recyclingCenters.location
        }
      })
      .from(pickups)
      .leftJoin(users, eq(pickups.userId, users.id))
      .leftJoin(recyclingCenters, eq(pickups.centerId, recyclingCenters.id))
      .where(and(
        eq(pickups.collectorId, (req as any).user?.id),
        notInArray(pickups.status, ['completed', 'failed'])
      ))
      .orderBy(desc(pickups.createdAt));

      const mapped = result.map(row => ({
        ...row.pickup,
        _id: row.pickup.id,
        userId: row.user ? { id: row.pickup.userId, _id: row.pickup.userId, ...row.user } : null,
        centerId: row.center ? { id: row.pickup.centerId, _id: row.pickup.centerId, ...row.center } : null
      }));
      res.json(mapped);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select({
        pickup: pickups,
        user: {
          name: users.name,
          phone: users.phone
        },
        center: {
          centerName: recyclingCenters.centerName,
          address: recyclingCenters.address
        }
      })
      .from(pickups)
      .leftJoin(users, eq(pickups.userId, users.id))
      .leftJoin(recyclingCenters, eq(pickups.centerId, recyclingCenters.id))
      .where(and(
        eq(pickups.collectorId, (req as any).user?.id),
        inArray(pickups.status, ['completed', 'failed'])
      ))
      .orderBy(desc(pickups.completedAt), desc(pickups.createdAt));

      const mapped = result.map(row => ({
        ...row.pickup,
        _id: row.pickup.id,
        userId: row.user ? { id: row.pickup.userId, _id: row.pickup.userId, ...row.user } : null,
        centerId: row.center ? { id: row.pickup.centerId, _id: row.pickup.centerId, ...row.center } : null
      }));
      res.json(mapped);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async assignPickup(req: Request, res: Response): Promise<void> {
    try {
      const updated = await db.update(pickups).set({
        status: 'accepted_by_collector',
        collectorId: (req as any).user?.id
      }).where(and(
        eq(pickups.id, req.params.id),
        eq(pickups.status, 'accepted_by_center'),
        isNull(pickups.collectorId)
      )).returning();

      if (updated.length === 0) {
        res.status(404).json({ message: 'Pickup not available' });
        return;
      }
      res.json(updated[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updatePickupStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, actualWeight, completionPhoto } = req.body;
      const pickupRes = await db.select().from(pickups).where(and(
        eq(pickups.id, req.params.id),
        eq(pickups.collectorId, (req as any).user?.id)
      )).limit(1);
      const pickup = pickupRes[0];
      if (!pickup) {
        res.status(404).json({ message: 'Pickup not found' });
        return;
      }

      if (status === 'completed') {
        if (!completionPhoto) {
          res.status(400).json({ message: 'Completion photo is required to complete a pickup' });
          return;
        }

        const weight = actualWeight || pickup.estimatedWeight;
        const co2Reduced = weight * 0.8;
        const ecoPoints = Math.floor(weight * ECO_POINTS_RATE);

        let finalCharge = pickup.deliveryCharge || 60;
        if (pickup.centerId) {
          const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, pickup.centerId)).limit(1);
          const center = centerRes[0];
          const userRes = await db.select().from(users).where(eq(users.id, pickup.userId)).limit(1);
          const userDoc = userRes[0];
          const userLoc = userDoc?.location as any;
          const centerLoc = center?.location as any;
          if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
            const distKm = haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng);
            finalCharge = calcDeliveryCharge(distKm, weight);
          } else {
            finalCharge = calcDeliveryCharge(0, weight);
          }
        }

        const currentProofImages = Array.isArray(pickup.deliveryProofImages) ? (pickup.deliveryProofImages as string[]) : [];
        if (!currentProofImages.includes(completionPhoto)) {
          currentProofImages.push(completionPhoto);
        }

        const updatedPickupRes = await db.update(pickups).set({
          status: 'completed',
          actualWeight: weight,
          co2Reduced,
          ecoPointsEarned: ecoPoints,
          completionPhoto,
          completedAt: new Date(),
          deliveryCharge: finalCharge,
          deliveryProofImages: currentProofImages
        }).where(eq(pickups.id, pickup.id)).returning();

        const updatedPickup = updatedPickupRes[0];

        const collectorRes = await db.select().from(collectors).where(eq(collectors.id, (req as any).user?.id)).limit(1);
        let collector = collectorRes[0];
        if (collector) {
          collector = await checkWeekReset(collector);
          const newWeeklyPickups = (collector.weeklyPickups || 0) + 1;
          const baseCharge = finalCharge;
          let newWeeklyEarnings = (collector.weeklyEarnings || 0) + baseCharge;
          let newTotalEarnings = (collector.totalEarnings || 0) + baseCharge;

          let bonusEarned = 0;
          for (const milestone of WEEKLY_MILESTONES) {
            const prevPickups = newWeeklyPickups - 1;
            if (prevPickups < milestone.pickups && newWeeklyPickups >= milestone.pickups) {
              bonusEarned += milestone.bonus;
            }
          }

          let newWeeklyBonus = (collector.weeklyBonusEarned || 0);
          if (bonusEarned > 0) {
            newWeeklyBonus += bonusEarned;
            newTotalEarnings += bonusEarned;
          }

          await db.update(collectors).set({
            totalPickups: (collector.totalPickups || 0) + 1,
            totalWeightCollected: (collector.totalWeightCollected || 0) + weight,
            totalEarnings: newTotalEarnings,
            weeklyPickups: newWeeklyPickups,
            weeklyEarnings: newWeeklyEarnings,
            weeklyBonusEarned: newWeeklyBonus,
            weekResetDate: collector.weekResetDate
          }).where(eq(collectors.id, (req as any).user?.id));

          // Earnings History
          const today = new Date();
          const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
          const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          const existingHistory = await db.select().from(earningsHistory).where(and(
            eq(earningsHistory.collectorId, (req as any).user?.id),
            eq(earningsHistory.day, dayName),
            gte(earningsHistory.createdAt, start)
          )).limit(1);

          if (existingHistory.length > 0) {
            await db.update(earningsHistory).set({
              earnings: (existingHistory[0].earnings || 0) + baseCharge + bonusEarned,
              pickups: (existingHistory[0].pickups || 0) + 1,
              bonus: (existingHistory[0].bonus || 0) + bonusEarned
            }).where(eq(earningsHistory.id, existingHistory[0].id));
          } else {
            await db.insert(earningsHistory).values({
              collectorId: (req as any).user?.id,
              day: dayName,
              earnings: baseCharge + bonusEarned,
              pickups: 1,
              bonus: bonusEarned
            });
          }

          await checkAndAwardCollectorBadges((req as any).user?.id || '');
        }

        // User Update
        const userRes = await db.select().from(users).where(eq(users.id, pickup.userId)).limit(1);
        const user = userRes[0];
        if (user) {
          await db.update(users).set({
            carbonCreditsBalance: (user.carbonCreditsBalance || 0) + USER_CREDITS_PER_PICKUP,
            ecoPoints: (user.ecoPoints || 0) + ecoPoints,
            totalCO2Reduced: (user.totalCO2Reduced || 0) + co2Reduced
          }).where(eq(users.id, pickup.userId));
        }

        if (pickup.centerId) {
          await checkAndAwardCenterBadges(pickup.centerId);
        }

        // Fraud check
        const estimatedW = pickup.estimatedWeight || 0;
        const mismatchPct = estimatedW > 0 ? Math.abs(weight - estimatedW) / estimatedW : 0;
        const mismatchKg = Math.abs(weight - estimatedW);
        const isMismatch = mismatchPct > 0.10 && mismatchKg > 0.5;
        const isAnomalous = weight > 50;
        if (isMismatch || isAnomalous) {
          const existingFraud = await db.select().from(fraudLogs).where(eq(fraudLogs.pickupId, pickup.id)).limit(1);
          if (existingFraud.length === 0) {
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
            await db.insert(fraudLogs).values({
              collectorId: (req as any).user?.id,
              pickupId: pickup.id,
              reason,
              severity,
              resolved: false
            });
          }
        }

        res.json({ message: 'Pickup completed successfully', pickup: updatedPickup });
        return;
      }

      const updatedPickupRes = await db.update(pickups).set({ status }).where(eq(pickups.id, pickup.id)).returning();
      res.json(updatedPickupRes[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getEarningsChart(req: Request, res: Response): Promise<void> {
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

        const recordRes = await db.select().from(earningsHistory).where(and(
          eq(earningsHistory.collectorId, (req as any).user?.id),
          gte(earningsHistory.createdAt, start),
          lt(earningsHistory.createdAt, end)
        )).limit(1);

        const record = recordRes[0];

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

  static async getRankings(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select({
        id: collectors.id,
        name: collectors.name,
        totalWeightCollected: collectors.totalWeightCollected,
        totalPickups: collectors.totalPickups,
        performanceRating: collectors.performanceRating,
        totalEarnings: collectors.totalEarnings,
        verified: collectors.verified
      }).from(collectors).orderBy(desc(collectors.totalPickups));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAllCollectors(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select({
        id: collectors.id,
        name: collectors.name,
        email: collectors.email,
        totalPickups: collectors.totalPickups,
        totalEarnings: collectors.totalEarnings,
        verified: collectors.verified,
        badges: collectors.badges,
        weeklyPickups: collectors.weeklyPickups,
        isBanned: collectors.isBanned
      }).from(collectors);
      res.json(result.map(c => ({ ...c, _id: c.id })));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
