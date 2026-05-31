import { Request, Response } from 'express';
import { db } from '../db';
import { users, collectors, recyclingCenters, businesses, pickups, fraudLogs, issues, sustainabilityScores, earningsHistory, eventParticipants, posts, wasteLogs, carbonCredits, postReactions } from '../schema';
import { eq, desc, count } from 'drizzle-orm';

export const getSustainabilityScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      ecoPoints: users.ecoPoints,
      totalCO2Reduced: users.totalCO2Reduced,
      sustainabilityScore: users.sustainabilityScore
    }).from(users);
    res.json(allUsers.map(u => ({ ...u, _id: u.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const calculateUserSustainabilityScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = result[0];
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const score = Math.min(100, ((user.ecoPoints || 0) / 100) + ((user.totalCO2Reduced || 0) / 10));
    await db.update(users).set({ sustainabilityScore: score }).where(eq(users.id, userId));
    await db.insert(sustainabilityScores).values({
      userId,
      score,
      factors: { ecoPoints: user.ecoPoints, co2: user.totalCO2Reduced }
    });
    res.json({ userId, score });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getFraudDetection = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      fraudLog: fraudLogs,
      collector: {
        name: collectors.name,
        email: collectors.email
      },
      pickup: pickups
    })
    .from(fraudLogs)
    .leftJoin(collectors, eq(fraudLogs.collectorId, collectors.id))
    .leftJoin(pickups, eq(fraudLogs.pickupId, pickups.id))
    .orderBy(desc(fraudLogs.createdAt));

    const logs = result.map(row => ({
      ...row.fraudLog,
      _id: row.fraudLog.id,
      collectorId: row.collector ? { id: row.fraudLog.collectorId, _id: row.fraudLog.collectorId, ...row.collector } : null,
      pickupId: row.pickup ? { ...row.pickup, _id: row.pickup.id } : null
    }));
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch fraud logs' });
  }
};

export const resolveFraudLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { logId } = req.params;
    const { notes } = req.body;
    const result = await db.select().from(fraudLogs).where(eq(fraudLogs.id, logId)).limit(1);
    const log = result[0];
    if (!log) {
      res.status(404).json({ message: 'Fraud log not found' });
      return;
    }
    const updated = await db.update(fraudLogs).set({
      resolved: true,
      resolvedBy: (req as any).user?.id,
      resolvedAt: new Date(),
      notes: notes || log.notes
    }).where(eq(fraudLogs.id, logId)).returning();
    res.json({ message: 'Fraud alert resolved successfully', log: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const reopenFraudLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { logId } = req.params;
    const result = await db.select().from(fraudLogs).where(eq(fraudLogs.id, logId)).limit(1);
    const log = result[0];
    if (!log) {
      res.status(404).json({ message: 'Fraud log not found' });
      return;
    }
    const updated = await db.update(fraudLogs).set({
      resolved: false,
      resolvedBy: null,
      resolvedAt: null
    }).where(eq(fraudLogs.id, logId)).returning();
    res.json({ message: 'Fraud alert reopened', log: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      ecoPoints: users.ecoPoints,
      carbonCreditsBalance: users.carbonCreditsBalance,
      badges: users.badges,
      sustainabilityScore: users.sustainabilityScore,
      verified: users.verified,
      isBanned: users.isBanned,
      createdAt: users.createdAt
    }).from(users).orderBy(desc(users.createdAt));
    res.json(allUsers.map(u => ({ ...u, _id: u.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const allBusinesses = await db.select({
      id: businesses.id,
      companyName: businesses.companyName,
      email: businesses.email,
      phone: businesses.phone,
      address: businesses.address,
      location: businesses.location,
      carbonCreditsPurchased: businesses.carbonCreditsPurchased,
      badges: businesses.badges,
      verified: businesses.verified,
      isBanned: businesses.isBanned,
      createdAt: businesses.createdAt
    }).from(businesses).orderBy(desc(businesses.createdAt));
    res.json(allBusinesses.map(b => ({ ...b, _id: b.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listRecyclingCenters = async (req: Request, res: Response): Promise<void> => {
  try {
    const allCenters = await db.select({
      id: recyclingCenters.id,
      centerName: recyclingCenters.centerName,
      email: recyclingCenters.email,
      phone: recyclingCenters.phone,
      address: recyclingCenters.address,
      location: recyclingCenters.location,
      carbonCreditsBalance: recyclingCenters.carbonCreditsBalance,
      badges: recyclingCenters.badges,
      isApproved: recyclingCenters.isApproved,
      isBanned: recyclingCenters.isBanned,
      createdAt: recyclingCenters.createdAt
    }).from(recyclingCenters).orderBy(desc(recyclingCenters.createdAt));
    res.json(allCenters.map(c => ({ ...c, _id: c.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(businesses).set({ verified: true }).where(eq(businesses.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }
    res.json({ message: 'Business verified successfully', business: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(businesses).set({ verified: false }).where(eq(businesses.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }
    res.json({ message: 'Business unverified successfully', business: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const banEntity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, id } = req.params;
    const { banned } = req.body;
    let doc: any;
    if (role === 'user') {
      const updated = await db.update(users).set({ isBanned: banned }).where(eq(users.id, id)).returning();
      doc = updated[0];
    } else if (role === 'collector') {
      const updated = await db.update(collectors).set({ isBanned: banned }).where(eq(collectors.id, id)).returning();
      doc = updated[0];
    } else if (role === 'recycling_center') {
      const updated = await db.update(recyclingCenters).set({ isBanned: banned }).where(eq(recyclingCenters.id, id)).returning();
      doc = updated[0];
    } else if (role === 'business') {
      const updated = await db.update(businesses).set({ isBanned: banned }).where(eq(businesses.id, id)).returning();
      doc = updated[0];
    } else {
      res.status(400).json({ message: 'Unknown role' });
      return;
    }
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: `Account ${banned ? 'banned' : 'unbanned'} successfully`, doc });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEntity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, id } = req.params;
    let doc: any;
    if (role === 'user') {
      await db.delete(sustainabilityScores).where(eq(sustainabilityScores.userId, id));
      await db.delete(eventParticipants).where(eq(eventParticipants.userId, id));
      
      // Clean up reactions first
      await db.delete(postReactions).where(eq(postReactions.userId, id));
      const userPosts = await db.select().from(posts).where(eq(posts.authorId, id));
      for (const p of userPosts) {
          await db.delete(postReactions).where(eq(postReactions.postId, p.id));
      }
      
      await db.delete(posts).where(eq(posts.authorId, id));
      await db.update(issues).set({ userId: null }).where(eq(issues.userId, id));
      await db.update(pickups).set({ userId: null }).where(eq(pickups.userId, id));
      const deleted = await db.delete(users).where(eq(users.id, id)).returning();
      doc = deleted[0];
    } else if (role === 'collector') {
      await db.delete(earningsHistory).where(eq(earningsHistory.collectorId, id));
      await db.delete(fraudLogs).where(eq(fraudLogs.collectorId, id));
      await db.update(issues).set({ collectorId: null }).where(eq(issues.collectorId, id));
      await db.update(pickups).set({ collectorId: null }).where(eq(pickups.collectorId, id));
      const deleted = await db.delete(collectors).where(eq(collectors.id, id)).returning();
      doc = deleted[0];
    } else if (role === 'recycling_center') {
      await db.delete(wasteLogs).where(eq(wasteLogs.centerId, id));
      await db.update(carbonCredits).set({ centerId: null }).where(eq(carbonCredits.centerId, id));
      await db.update(pickups).set({ centerId: null }).where(eq(pickups.centerId, id));
      const deleted = await db.delete(recyclingCenters).where(eq(recyclingCenters.id, id)).returning();
      doc = deleted[0];
    } else if (role === 'business') {
      await db.update(carbonCredits).set({ businessId: null }).where(eq(carbonCredits.businessId, id));
      const deleted = await db.delete(businesses).where(eq(businesses.id, id)).returning();
      doc = deleted[0];
    } else {
      res.status(400).json({ message: 'Unknown role' });
      return;
    }
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Account permanently deleted' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyRecyclingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    const updated = await db.update(recyclingCenters).set({ isApproved: verified }).where(eq(recyclingCenters.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Center not found' });
      return;
    }
    res.json({ message: `Center ${verified ? 'verified' : 'unverified'} successfully`, center: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getHeatmapData = async (req: Request, res: Response): Promise<void> => {
  try {
    const completedPickups = await db.select({
      location: users.location,
      weight: pickups.actualWeight
    })
    .from(pickups)
    .innerJoin(users, eq(pickups.userId, users.id))
    .where(eq(pickups.status, 'completed'));

    const heatmapData = completedPickups.filter((d) => d.location);
    res.json(heatmapData);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const completed = await db.select({
      actualWeight: pickups.actualWeight,
      co2Reduced: pickups.co2Reduced
    }).from(pickups).where(eq(pickups.status, 'completed'));

    const totalWaste = completed.reduce((sum, p) => sum + (p.actualWeight || 0), 0);
    const totalCO2 = completed.reduce((sum, p) => sum + (p.co2Reduced || 0), 0);

    const usersCount = await db.select({ value: count() }).from(users);
    const activeUsers = usersCount[0]?.value || 0;

    const collectorsCount = await db.select({ value: count() }).from(collectors);
    const totalCollectors = collectorsCount[0]?.value || 0;

    const unresolvedFraud = await db.select({
      fraudLog: fraudLogs,
      collector: {
        name: collectors.name
      }
    })
    .from(fraudLogs)
    .leftJoin(collectors, eq(fraudLogs.collectorId, collectors.id))
    .where(eq(fraudLogs.resolved, false))
    .limit(5);

    const mappedFraudLogs = unresolvedFraud.map(row => ({
      ...row.fraudLog,
      _id: row.fraudLog.id,
      collectorId: row.collector ? { id: row.fraudLog.collectorId, _id: row.fraudLog.collectorId, ...row.collector } : null
    }));

    const openIssues = await db.select({
      issue: issues,
      user: {
        name: users.name
      }
    })
    .from(issues)
    .leftJoin(users, eq(issues.userId, users.id))
    .where(eq(issues.status, 'open'))
    .limit(5);

    const mappedIssues = openIssues.map(row => ({
      ...row.issue,
      _id: row.issue.id,
      userId: row.user ? { id: row.issue.userId, _id: row.issue.userId, ...row.user } : null
    }));

    res.json({
      totalWaste,
      totalCO2,
      activeUsers,
      totalCollectors,
      fraudLogs: mappedFraudLogs,
      issues: mappedIssues
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadgeToCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { centerId, badgeName } = req.body;
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, centerId)).limit(1);
    const center = centerRes[0];
    if (!center) {
      res.status(404).json({ message: 'Center not found' });
      return;
    }
    let currentBadges: string[] = Array.isArray(center.badges) ? (center.badges as string[]) : [];
    if (!currentBadges.includes(badgeName)) {
      currentBadges = [...currentBadges, badgeName];
      await db.update(recyclingCenters).set({ badges: currentBadges }).where(eq(recyclingCenters.id, centerId));
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${center.centerName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadgeToBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId, badgeName } = req.body;
    const businessRes = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const business = businessRes[0];
    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }
    let currentBadges: string[] = Array.isArray(business.badges) ? (business.badges as string[]) : [];
    if (!currentBadges.includes(badgeName)) {
      currentBadges = [...currentBadges, badgeName];
      await db.update(businesses).set({ badges: currentBadges }).where(eq(businesses.id, businessId));
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyCollector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(collectors).set({ verified: true }).where(eq(collectors.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    res.json({ message: `Collector verified successfully`, collector: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyCollector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(collectors).set({ verified: false }).where(eq(collectors.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    res.json({ message: `Collector unverified successfully`, collector: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(users).set({ verified: true }).where(eq(users.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ message: `User verified successfully`, user: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await db.update(users).set({ verified: false }).where(eq(users.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ message: `User unverified successfully`, user: updated[0] });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
