import { User } from '../models/User';
import { Collector } from '../models/Collector';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { Badge } from '../models/Badge';
import { Pickup } from '../models/Pickup';
import type { HydratedDocument } from 'mongoose';

export async function checkAndAwardUserBadges(userId: string) {
  try {
    const user = await User.findById(userId) as HydratedDocument<any> | null;
    if (!user) return;
    
    const allBadges = await Badge.find({ targetRole: { $in: ['user', 'all'] } });
    for (const badge of allBadges) {
      if (user.badges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      let earned = false;
      if (badge.criteria.type === 'ecoPoints' && user.ecoPoints >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'co2Reduced' && user.totalCO2Reduced >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'pickupsCompleted') {
        const count = await Pickup.countDocuments({ userId, status: 'completed' });
        if (count >= badge.criteria.threshold) earned = true;
      }
      if (badge.criteria.type === 'carbonCredits' && user.carbonCreditsBalance >= badge.criteria.threshold) earned = true;
      
      if (earned) {
        user.badges.push(badge.badgeName);
        await user.save();
      }
    }
  } catch (err) {
    console.error('Badge check error:', err);
  }
}

export async function checkAndAwardCollectorBadges(collectorId: string) {
  try {
    const collector = await Collector.findById(collectorId) as HydratedDocument<any> | null;
    if (!collector) return;
    
    const allBadges = await Badge.find({ targetRole: { $in: ['collector', 'all'] } });
    for (const badge of allBadges) {
      if (collector.badges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      let earned = false;
      if (badge.criteria.type === 'pickupsCompleted' && collector.totalPickups >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'weeklyPickups' && collector.weeklyPickups >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'totalEarnings' && collector.totalEarnings >= badge.criteria.threshold) earned = true;
      
      if (earned) {
        collector.badges.push(badge.badgeName);
        await collector.save();
      }
    }
  } catch (err) {
    console.error('Collector badge check error:', err);
  }
}

export async function checkAndAwardCenterBadges(centerId: string) {
  try {
    const center = await RecyclingCenter.findById(centerId) as HydratedDocument<any> | null;
    if (!center) return;
    
    const allBadges = await Badge.find({ targetRole: 'recycling_center', criteria: { $ne: null } });
    for (const badge of allBadges) {
      if (center.badges.includes(badge.badgeName)) continue;
      if (!badge.criteria) continue;
      
      let earned = false;
      if (badge.criteria.type === 'pickupsProcessed') {
        const count = await Pickup.countDocuments({ centerId, status: 'completed' });
        if (count >= badge.criteria.threshold) earned = true;
      }
      if (badge.criteria.type === 'totalWasteKg') {
        const pickups = await Pickup.find({ centerId, status: 'completed' });
        const totalKg = pickups.reduce((sum: number, p: any) => sum + (p.actualWeight || p.estimatedWeight || 0), 0);
        if (totalKg >= badge.criteria.threshold) earned = true;
      }
      if (badge.criteria.type === 'wasteTypeDiversity') {
        const pickups = await Pickup.find({ centerId, status: 'completed' });
        const types = new Set(pickups.map((p: any) => p.wasteType));
        if (types.size >= badge.criteria.threshold) earned = true;
      }
      
      if (earned) {
        center.badges.push(badge.badgeName);
        await center.save();
      }
    }
  } catch (err) {
    console.error('Center badge check error:', err);
  }
}
