import { Request, Response } from 'express';
import { db } from '../db';
import { users, pickups, collectors, recyclingCenters, badges } from '../schema';
import { eq, and, desc, asc, or, isNotNull } from 'drizzle-orm';
import { ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP, WEEKLY_MILESTONES, CARBON_CREDIT_RATES, DEFAULT_CREDIT_RATE, calcDeliveryCharge, haversineKm } from '../utils/helpers';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRes = await db.select().from(users).where(eq(users.id, (req as any).user.id)).limit(1);
    const user = userRes[0];
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ ...user, _id: user.id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, location } = req.body;
    const updated = await db.update(users).set({ name, phone, location }).where(eq(users.id, (req as any).user.id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyPickups = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      pickup: pickups,
      collector: {
        name: collectors.name,
        phone: collectors.phone,
        performanceRating: collectors.performanceRating,
        totalRatings: collectors.totalRatings
      },
      center: {
        centerName: recyclingCenters.centerName,
        address: recyclingCenters.address
      }
    })
    .from(pickups)
    .leftJoin(collectors, eq(pickups.collectorId, collectors.id))
    .leftJoin(recyclingCenters, eq(pickups.centerId, recyclingCenters.id))
    .where(eq(pickups.userId, (req as any).user.id))
    .orderBy(desc(pickups.createdAt));

    res.json(result.map(row => ({
      ...row.pickup,
      _id: row.pickup.id,
      collectorId: row.collector ? { id: row.pickup.collectorId, _id: row.pickup.collectorId, ...row.collector } : null,
      centerId: row.center ? { id: row.pickup.centerId, _id: row.pickup.centerId, ...row.center } : null
    })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      ecoPoints: users.ecoPoints,
      totalCO2Reduced: users.totalCO2Reduced,
      badges: users.badges,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.role, 'user'))
    .orderBy(desc(users.ecoPoints), desc(users.totalCO2Reduced), asc(users.name));

    const ranked = allUsers.map((user, idx) => ({
      id: user.id,
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

export const ratePickup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stars, review } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      res.status(400).json({ message: "Stars must be 1–5" });
      return;
    }
    const pickupRes = await db.select().from(pickups).where(and(
      eq(pickups.id, req.params.id),
      eq(pickups.userId, (req as any).user.id),
      eq(pickups.status, 'completed')
    )).limit(1);
    
    const pickup = pickupRes[0];
    if (!pickup) {
      res.status(404).json({ message: "Completed pickup not found" });
      return;
    }
    
    const ratingObj = pickup.rating as any;
    if (ratingObj?.stars) {
      res.status(400).json({ message: "Already rated" });
      return;
    }
    
    const updated = await db.update(pickups).set({
      rating: { stars, review: review || '', ratedAt: new Date().toISOString() }
    }).where(eq(pickups.id, req.params.id)).returning();
    
    if (pickup.collectorId) {
      const collectorRes = await db.select().from(collectors).where(eq(collectors.id, pickup.collectorId)).limit(1);
      const collector = collectorRes[0];
      if (collector) {
        const newRatingSum = (collector.ratingSum || 0) + stars;
        const newTotalRatings = (collector.totalRatings || 0) + 1;
        const newPerformanceRating = Math.round((newRatingSum / newTotalRatings) * 10) / 10;
        await db.update(collectors).set({
          ratingSum: newRatingSum,
          totalRatings: newTotalRatings,
          performanceRating: newPerformanceRating
        }).where(eq(collectors.id, pickup.collectorId));
      }
    }
    res.json({ message: "Rating submitted successfully", pickup: { ...updated[0], _id: updated[0].id } });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBadgeProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRes = await db.select().from(users).where(eq(users.id, (req as any).user.id)).limit(1);
    const user = userRes[0];
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    const allBadges = await db.select().from(badges).where(and(
      or(eq(badges.targetRole, 'user'), eq(badges.targetRole, 'all')),
      isNotNull(badges.criteria)
    ));
    
    const completedPickups = await db.select().from(pickups).where(and(
      eq(pickups.userId, (req as any).user.id),
      eq(pickups.status, 'completed')
    ));
    
    const completedCount = completedPickups.length;
    
    const progress = allBadges.map((badge) => {
      let current = 0;
      const criteria = badge.criteria as any;
      const threshold = criteria?.threshold || 0;
      if (criteria?.type === 'pickupsCompleted') current = completedCount;
      else if (criteria?.type === 'ecoPoints') current = user.ecoPoints || 0;
      else if (criteria?.type === 'co2Reduced') current = user.totalCO2Reduced || 0;
      else if (criteria?.type === 'carbonCredits') current = user.carbonCreditsBalance || 0;
      
      const userBadges = Array.isArray(user.badges) ? (user.badges as string[]) : [];

      return {
        _id: badge.id,
        badgeName: badge.badgeName,
        description: badge.description,
        iconURL: badge.iconURL,
        criteria,
        current,
        threshold,
        earned: userBadges.includes(badge.badgeName),
        completedPickups: completedCount,
        wasteBreakdown: completedPickups.reduce((acc: any, p) => {
          acc[p.wasteType] = (acc[p.wasteType] || 0) + (p.actualWeight || p.estimatedWeight || 0);
          return acc;
        }, {})
      };
    });
    res.json(progress);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const estimateCharge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, weightKg = 5 } = req.body;
    if (!lat || !lng) {
      res.status(400).json({ message: "Location required" });
      return;
    }
    const centers = await db.select().from(recyclingCenters);
    let nearest: any = null;
    let minDist = Infinity;
    for (const c of centers) {
      const cLoc = c.location as any;
      if (!cLoc?.lat || !cLoc?.lng) continue;
      const dist = haversineKm(lat, lng, cLoc.lat, cLoc.lng);
      if (dist < minDist) { minDist = dist; nearest = c; }
    }
    if (!nearest || minDist === Infinity) {
      const fallback = calcDeliveryCharge(0, weightKg);
      res.json({ charge: fallback, distanceKm: 0, nearestCenter: null });
      return;
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

export const claimBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { badgeName } = req.body;
    const userRes = await db.select().from(users).where(eq(users.id, (req as any).user.id)).limit(1);
    const user = userRes[0];
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const userBadges = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    if (userBadges.includes(badgeName)) {
      res.status(400).json({ message: "Badge already claimed" });
      return;
    }
    
    const badgeRes = await db.select().from(badges).where(and(
      eq(badges.badgeName, badgeName),
      or(eq(badges.targetRole, 'user'), eq(badges.targetRole, 'all'))
    )).limit(1);
    const badge = badgeRes[0];
    if (!badge || !badge.criteria) {
      res.status(400).json({ message: "Badge not found or not claimable" });
      return;
    }
    
    const completedPickups = await db.select().from(pickups).where(and(
      eq(pickups.userId, (req as any).user.id),
      eq(pickups.status, 'completed')
    ));
    const completedCount = completedPickups.length;
    
    let met = false;
    const criteria = badge.criteria as any;
    if (criteria.type === 'pickupsCompleted' && completedCount >= criteria.threshold) met = true;
    if (criteria.type === 'ecoPoints' && (user.ecoPoints || 0) >= criteria.threshold) met = true;
    if (criteria.type === 'co2Reduced' && (user.totalCO2Reduced || 0) >= criteria.threshold) met = true;
    if (criteria.type === 'carbonCredits' && (user.carbonCreditsBalance || 0) >= criteria.threshold) met = true;
    
    if (!met) {
      res.status(400).json({ message: "You have not met the criteria for this badge yet. Only completed pickups (collected by a collector) count towards your progress." });
      return;
    }
    
    userBadges.push(badgeName);
    await db.update(users).set({ badges: userBadges }).where(eq(users.id, (req as any).user.id));
    res.json({ message: `Badge "${badgeName}" claimed successfully!`, badges: userBadges });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const redeemReward = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rewardId, rewardTitle, pointsCost } = req.body;
    if (!rewardTitle || !pointsCost || pointsCost <= 0) {
      res.status(400).json({ message: "Invalid reward data" });
      return;
    }
    const userRes = await db.select().from(users).where(eq(users.id, (req as any).user.id)).limit(1);
    const user = userRes[0];
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if ((user.ecoPoints || 0) < pointsCost) {
      res.status(400).json({ message: "Insufficient eco-points" });
      return;
    }
    
    const redeemed = Array.isArray(user.redeemedRewards) ? (user.redeemedRewards as any[]) : [];
    redeemed.push({ rewardId, rewardTitle, pointsCost, redeemedAt: new Date().toISOString() });
    
    await db.update(users).set({
      ecoPoints: (user.ecoPoints || 0) - pointsCost,
      redeemedRewards: redeemed
    }).where(eq(users.id, (req as any).user.id));
    
    res.json({
      message: `"${rewardTitle}" redeemed successfully!`,
      ecoPoints: (user.ecoPoints || 0) - pointsCost
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getRedeemedRewards = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRes = await db.select({ redeemedRewards: users.redeemedRewards }).from(users).where(eq(users.id, (req as any).user.id)).limit(1);
    const user = userRes[0];
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    const redeemed = Array.isArray(user.redeemedRewards) ? (user.redeemedRewards as any[]) : [];
    const history = [...redeemed].sort(
      (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
    );
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const schedulePickup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, ...pickupData } = req.body;
    if (location?.lat && location?.lng) {
      await db.update(users).set({ location }).where(eq(users.id, (req as any).user.id));
    }
    const inserted = await db.insert(pickups).values({
      ...pickupData,
      userId: (req as any).user.id,
      status: 'pending'
    }).returning();
    
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};