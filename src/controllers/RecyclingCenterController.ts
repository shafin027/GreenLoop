import { Request, Response } from 'express';
import { db } from '../db';
import { recyclingCenters, pickups, badges, wasteLogs, carbonCredits, certificates, businesses, users, collectors } from '../schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { ECO_POINTS_RATE, USER_CREDITS_PER_PICKUP, WEEKLY_MILESTONES, CARBON_CREDIT_RATES, DEFAULT_CREDIT_RATE, calcDeliveryCharge, haversineKm, checkAndAwardCollectorBadges, checkAndAwardUserBadges, checkAndAwardCenterBadges } from '../utils/helpers';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, (req as any).user.id)).limit(1);
    const center = centerRes[0];
    if (!center) {
      res.status(404).json({ message: "Center not found" });
      return;
    }
    res.json(center);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, phone, location } = req.body;
    const updates: any = {};
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (location?.lat && location?.lng) updates.location = location;

    const updated = await db.update(recyclingCenters).set(updates).where(eq(recyclingCenters.id, (req as any).user.id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: "Center not found" });
      return;
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBadgeProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, (req as any).user.id)).limit(1);
    const center = centerRes[0];
    if (!center) {
      res.status(404).json({ message: "Center not found" });
      return;
    }

    const allBadges = await db.select().from(badges).where(and(
      eq(badges.targetRole, 'recycling_center'),
      isNotNull(badges.criteria)
    ));

    const completedPickups = await db.select().from(pickups).where(and(
      eq(pickups.centerId, (req as any).user.id),
      eq(pickups.status, 'completed')
    ));

    const completedCount = completedPickups.length;
    const totalKg = completedPickups.reduce((sum, p: any) => sum + (p.actualWeight || p.estimatedWeight || 0), 0);
    const wasteTypes = new Set(completedPickups.map((p: any) => p.wasteType));
    const wasteBreakdown = completedPickups.reduce((acc: any, p: any) => {
      acc[p.wasteType] = (acc[p.wasteType] || 0) + (p.actualWeight || p.estimatedWeight || 0);
      return acc;
    }, {});

    const progress = allBadges.map((badge) => {
      let current = 0;
      const criteria = badge.criteria as any;
      if (criteria?.type === 'pickupsProcessed') current = completedCount;
      else if (criteria?.type === 'totalWasteKg') current = totalKg;
      else if (criteria?.type === 'wasteTypeDiversity') current = wasteTypes.size;
      const threshold = criteria?.threshold || 0;
      
      const centerBadges = Array.isArray(center.badges) ? (center.badges as string[]) : [];

      return {
        _id: badge.id,
        badgeName: badge.badgeName,
        description: badge.description,
        iconURL: badge.iconURL,
        criteria,
        current: Math.round(current),
        threshold,
        earned: centerBadges.includes(badge.badgeName),
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

export const getPendingPickups = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      pickup: pickups,
      user: {
        name: users.name,
        phone: users.phone,
        location: users.location
      }
    })
    .from(pickups)
    .leftJoin(users, eq(pickups.userId, users.id))
    .where(eq(pickups.status, 'pending'))
    .orderBy(desc(pickups.createdAt));

    res.json(result.map(row => ({
      ...row.pickup,
      _id: row.pickup.id,
      userId: row.user ? { id: row.pickup.userId, _id: row.pickup.userId, ...row.user } : null
    })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const acceptPickup = async (req: Request, res: Response): Promise<void> => {
  try {
    const pickupRes = await db.select({
      pickup: pickups,
      user: {
        location: users.location
      }
    })
    .from(pickups)
    .leftJoin(users, eq(pickups.userId, users.id))
    .where(and(eq(pickups.id, req.params.id), eq(pickups.status, 'pending')))
    .limit(1);

    const row = pickupRes[0];
    if (!row) {
      res.status(404).json({ message: "Pickup not found or already accepted" });
      return;
    }

    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, (req as any).user.id)).limit(1);
    const center = centerRes[0];
    if (!center?.isApproved) {
      res.status(403).json({ message: "Your center must be verified by an admin before you can accept pickups." });
      return;
    }

    const userLoc = row.user?.location as any;
    const centerLoc = center?.location as any;
    let charge = 60; // default minimum
    if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
      const distKm = haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng);
      charge = calcDeliveryCharge(distKm, row.pickup.estimatedWeight || 0);
    }

    const updated = await db.update(pickups).set({
      status: 'accepted_by_center',
      centerId: (req as any).user.id,
      deliveryCharge: charge
    }).where(eq(pickups.id, req.params.id)).returning();

    res.json({ ...updated[0], _id: updated[0].id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyPickups = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      pickup: pickups,
      user: {
        name: users.name,
        phone: users.phone
      },
      collector: {
        name: collectors.name,
        phone: collectors.phone
      }
    })
    .from(pickups)
    .leftJoin(users, eq(pickups.userId, users.id))
    .leftJoin(collectors, eq(pickups.collectorId, collectors.id))
    .where(eq(pickups.centerId, (req as any).user.id))
    .orderBy(desc(pickups.createdAt));

    res.json(result.map(row => ({
      ...row.pickup,
      _id: row.pickup.id,
      userId: row.user ? { id: row.pickup.userId, _id: row.pickup.userId, ...row.user } : null,
      collectorId: row.collector ? { id: row.pickup.collectorId, _id: row.pickup.collectorId, ...row.collector } : null
    })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAvailableWaste = async (req: Request, res: Response): Promise<void> => {
  try {
    const completedPickups = await db.select().from(pickups).where(and(
      eq(pickups.centerId, (req as any).user.id),
      eq(pickups.status, 'completed')
    ));

    const deliveredByType: Record<string, number> = {};
    for (const p of completedPickups) {
      const t = p.wasteType || 'other';
      deliveredByType[t] = (deliveredByType[t] || 0) + (p.actualWeight || p.estimatedWeight || 0);
    }

    const logs = await db.select().from(wasteLogs).where(eq(wasteLogs.centerId, (req as any).user.id));
    const loggedByType: Record<string, number> = {};
    for (const l of logs) {
      loggedByType[l.category] = (loggedByType[l.category] || 0) + (l.weight || 0);
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

export const logWaste = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, weight } = req.body;
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, (req as any).user.id)).limit(1);
    const center = centerRes[0];
    if (!center) {
      res.status(404).json({ message: "Center not found" });
      return;
    }
    if (!center.isApproved) {
      res.status(403).json({ message: "Your center must be verified by an admin before logging waste." });
      return;
    }

    // Check weight doesn't exceed what was actually delivered for this waste type
    const completedPickups = await db.select().from(pickups).where(and(
      eq(pickups.centerId, (req as any).user.id),
      eq(pickups.status, 'completed'),
      eq(pickups.wasteType, category)
    ));
    const totalDelivered = completedPickups.reduce((s: number, p: any) => s + (p.actualWeight || p.estimatedWeight || 0), 0);

    const loggedLogs = await db.select({ weight: wasteLogs.weight }).from(wasteLogs).where(and(
      eq(wasteLogs.centerId, (req as any).user.id),
      eq(wasteLogs.category, category)
    ));
    const loggedSoFar = loggedLogs.reduce((s, l) => s + (l.weight || 0), 0);

    const remaining = totalDelivered - loggedSoFar;
    if (weight > remaining) {
      res.status(400).json({
        message: `Cannot log ${weight}kg — only ${remaining.toFixed(2)}kg of ${category} has been delivered to your center and not yet logged.`
      });
      return;
    }

    const rate = CARBON_CREDIT_RATES[category] ?? DEFAULT_CREDIT_RATE;
    const carbonReduced = weight * 0.8;
    const creditsEarned = Math.ceil(weight * rate);

    const newTotalWaste = (center.totalWasteProcessed || 0) + weight;
    const newTotalCarbon = (center.totalCarbonReduced || 0) + carbonReduced;
    const newCreditsBal = (center.carbonCreditsBalance || 0) + creditsEarned;

    const updatedCenterRes = await db.update(recyclingCenters).set({
      totalWasteProcessed: newTotalWaste,
      totalCarbonReduced: newTotalCarbon,
      carbonCreditsBalance: newCreditsBal
    }).where(eq(recyclingCenters.id, (req as any).user.id)).returning();

    await db.insert(wasteLogs).values({
      centerId: (req as any).user.id,
      category,
      weight,
      carbonCreditsEarned: creditsEarned
    });

    res.json({
      center: updatedCenterRes[0],
      creditsEarned,
      rate,
      message: `Logged ${weight}kg of ${category}. Earned ${creditsEarned} carbon credits (rate: ${rate}/kg)!`
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listCredits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, price, source } = req.body;
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, (req as any).user.id)).limit(1);
    const center = centerRes[0];
    if (!center) {
      res.status(404).json({ message: "Center not found" });
      return;
    }
    if (!center.isApproved) {
      res.status(403).json({ message: "Your center must be verified before listing credits in the marketplace." });
      return;
    }
    if ((center.carbonCreditsBalance || 0) < amount) {
      res.status(400).json({ message: "Insufficient carbon credits balance" });
      return;
    }

    await db.update(recyclingCenters).set({
      carbonCreditsBalance: (center.carbonCreditsBalance || 0) - amount
    }).where(eq(recyclingCenters.id, (req as any).user.id));

    const credit = await db.insert(carbonCredits).values({
      amount,
      price,
      source: source || center.centerName,
      status: 'available',
      centerId: (req as any).user.id
    }).returning();

    res.status(201).json(credit[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const issueCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issuedToId, issuedToType, certificateType, verifiedData } = req.body;
    const cert = await db.insert(certificates).values({
      issuedToId,
      issuedToType,
      certificateType,
      verifiedData,
      issueDate: new Date()
    }).returning();
    res.status(201).json(cert[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId, badgeName } = req.body;
    const businessRes = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const business = businessRes[0];
    if (!business) {
      res.status(404).json({ message: "Business not found" });
      return;
    }
    const currentBadges = Array.isArray(business.badges) ? (business.badges as string[]) : [];
    if (!currentBadges.includes(badgeName)) {
      currentBadges.push(badgeName);
      await db.update(businesses).set({ badges: currentBadges }).where(eq(businesses.id, businessId));
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const allBus = await db.select({
      id: businesses.id,
      companyName: businesses.companyName,
      email: businesses.email,
      badges: businesses.badges
    }).from(businesses);
    res.json(allBus.map(b => ({ ...b, _id: b.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getWasteLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await db.select().from(wasteLogs).where(eq(wasteLogs.centerId, (req as any).user.id)).orderBy(desc(wasteLogs.createdAt)).limit(20);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};