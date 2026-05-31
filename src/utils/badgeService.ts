import { db } from '../db';
import { users, collectors, recyclingCenters, badges, pickups } from '../schema';
import { eq, or, and, count } from 'drizzle-orm';

export async function checkAndAwardUserBadges(userId: string): Promise<void> {
  try {
    const userRes = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRes[0];
    if (!user) return;
    
    const allBadges = await db.select().from(badges).where(
      or(eq(badges.targetRole, 'user'), eq(badges.targetRole, 'all'))
    );
    
    const userBadges = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    
    for (const badge of allBadges) {
      if (userBadges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      const criteria = badge.criteria as any;
      let earned = false;
      
      if (criteria.type === 'ecoPoints' && (user.ecoPoints || 0) >= criteria.threshold) earned = true;
      if (criteria.type === 'co2Reduced' && (user.totalCO2Reduced || 0) >= criteria.threshold) earned = true;
      if (criteria.type === 'pickupsCompleted') {
        const countRes = await db.select({ value: count() }).from(pickups).where(
          and(eq(pickups.userId, userId), eq(pickups.status, 'completed'))
        );
        const cnt = countRes[0]?.value || 0;
        if (cnt >= criteria.threshold) earned = true;
      }
      if (criteria.type === 'carbonCredits' && (user.carbonCreditsBalance || 0) >= criteria.threshold) earned = true;
      
      if (earned) {
        userBadges.push(badge.badgeName);
        await db.update(users).set({ badges: userBadges }).where(eq(users.id, userId));
      }
    }
  } catch (err) {
    console.error('Badge check error:', err);
  }
}

export async function checkAndAwardCollectorBadges(collectorId: string): Promise<void> {
  try {
    const collectorRes = await db.select().from(collectors).where(eq(collectors.id, collectorId)).limit(1);
    const collector = collectorRes[0];
    if (!collector) return;
    
    const allBadges = await db.select().from(badges).where(
      or(eq(badges.targetRole, 'collector'), eq(badges.targetRole, 'all'))
    );
    
    const collectorBadges = Array.isArray(collector.badges) ? (collector.badges as string[]) : [];
    
    for (const badge of allBadges) {
      if (collectorBadges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      const criteria = badge.criteria as any;
      let earned = false;
      
      if (criteria.type === 'pickupsCompleted' && (collector.totalPickups || 0) >= criteria.threshold) earned = true;
      if (criteria.type === 'weeklyPickups' && (collector.weeklyPickups || 0) >= criteria.threshold) earned = true;
      if (criteria.type === 'totalEarnings' && (collector.totalEarnings || 0) >= criteria.threshold) earned = true;
      
      if (earned) {
        collectorBadges.push(badge.badgeName);
        await db.update(collectors).set({ badges: collectorBadges }).where(eq(collectors.id, collectorId));
      }
    }
  } catch (err) {
    console.error('Collector badge check error:', err);
  }
}

export async function checkAndAwardCenterBadges(centerId: string): Promise<void> {
  try {
    const centerRes = await db.select().from(recyclingCenters).where(eq(recyclingCenters.id, centerId)).limit(1);
    const center = centerRes[0];
    if (!center) return;
    
    const allBadges = await db.select().from(badges).where(eq(badges.targetRole, 'recycling_center'));
    
    const centerBadges = Array.isArray(center.badges) ? (center.badges as string[]) : [];
    
    for (const badge of allBadges) {
      if (centerBadges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      const criteria = badge.criteria as any;
      let earned = false;
      
      if (criteria.type === 'pickupsProcessed') {
        const countRes = await db.select({ value: count() }).from(pickups).where(
          and(eq(pickups.centerId, centerId), eq(pickups.status, 'completed'))
        );
        const cnt = countRes[0]?.value || 0;
        if (cnt >= criteria.threshold) earned = true;
      }
      if (criteria.type === 'totalWasteKg') {
        const result = await db.select({
          actualWeight: pickups.actualWeight,
          estimatedWeight: pickups.estimatedWeight
        }).from(pickups).where(
          and(eq(pickups.centerId, centerId), eq(pickups.status, 'completed'))
        );
        
        const totalKg = result.reduce((sum, p) => sum + (p.actualWeight || p.estimatedWeight || 0), 0);
        if (totalKg >= criteria.threshold) earned = true;
      }
      if (criteria.type === 'wasteTypeDiversity') {
        const result = await db.select({
          wasteType: pickups.wasteType
        }).from(pickups).where(
          and(eq(pickups.centerId, centerId), eq(pickups.status, 'completed'))
        );
        
        const types = new Set(result.map(p => p.wasteType));
        if (types.size >= criteria.threshold) earned = true;
      }
      
      if (earned) {
        centerBadges.push(badge.badgeName);
        await db.update(recyclingCenters).set({ badges: centerBadges }).where(eq(recyclingCenters.id, centerId));
      }
    }
  } catch (err) {
    console.error('Center badge check error:', err);
  }
}
