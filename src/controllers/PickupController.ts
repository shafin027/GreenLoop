import { Request, Response } from 'express';
import { db } from '../db';
import { pickups, users, recyclingCenters, collectors } from '../schema';
import { eq, and } from 'drizzle-orm';
import { calcDeliveryCharge, haversineKm } from '../utils/calculations';

export class PickupController {
  static async schedulePickup(req: Request, res: Response): Promise<void> {
    try {
      const { location, ...pickupData } = req.body;
      const userId = (req as any).user.id;
      
      if (location?.lat && location?.lng) {
        await db.update(users).set({ location }).where(eq(users.id, userId));
      }
      
      const pickup = await db.insert(pickups).values({
        ...pickupData,
        userId,
        status: 'pending'
      }).returning();
      
      res.status(201).json({ ...pickup[0], _id: pickup[0].id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async estimateCharge(req: Request, res: Response): Promise<void> {
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
        if (dist < minDist) { 
          minDist = dist; 
          nearest = c; 
        }
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
  }

  static async ratePickup(req: Request, res: Response): Promise<void> {
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
      
      const newRating = { stars, review: review || '', ratedAt: new Date().toISOString() };
      const updatedPickupRes = await db.update(pickups).set({
        rating: newRating
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
      
      res.json({ message: "Rating submitted successfully", pickup: { ...updatedPickupRes[0], _id: updatedPickupRes[0].id } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async uploadProof(req: Request, res: Response): Promise<void> {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        res.status(400).json({ message: 'imageUrl is required' });
        return;
      }
      
      const pickupRes = await db.select().from(pickups).where(eq(pickups.id, req.params.pickupId)).limit(1);
      const pickup = pickupRes[0];
      if (!pickup) {
        res.status(404).json({ message: 'Pickup not found' });
        return;
      }
      if (pickup.collectorId !== (req as any).user.id) {
        res.status(403).json({ message: 'You can only upload proof for your own deliveries' });
        return;
      }
      
      const proofImages = Array.isArray(pickup.deliveryProofImages) ? (pickup.deliveryProofImages as string[]) : [];
      if (!proofImages.includes(imageUrl)) {
        proofImages.push(imageUrl);
      }
      
      const updated = await db.update(pickups).set({
        deliveryProofImages: proofImages
      }).where(eq(pickups.id, req.params.pickupId)).returning();
      
      res.json({ message: 'Delivery proof uploaded successfully', images: updated[0].deliveryProofImages });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default PickupController;
