import { Request, Response } from 'express';
import { Pickup } from '../models/Pickup';
import { User } from '../models/User';
import { calcDeliveryCharge, haversineKm } from '../utils/calculations';
import { checkAndAwardUserBadges, checkAndAwardCollectorBadges, checkAndAwardCenterBadges } from '../utils/badgeService';
import { logFraudIfNeeded } from '../utils/fraudService';
import { Collector } from '../models/Collector';
import { RecyclingCenter } from '../models/RecyclingCenter';

export class PickupController {
  static async schedulePickup(req: Request, res: Response) {
    try {
      const { location, ...pickupData } = req.body;
      const userId = (req as any).user.id;
      
      if (location?.lat && location?.lng) {
        await User.findByIdAndUpdate(userId, { location });
      }
      
      const pickup = await Pickup.create({
        ...pickupData,
        userId,
        status: 'pending'
      });
      
      res.status(201).json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async estimateCharge(req: Request, res: Response) {
    try {
      const { lat, lng, weightKg = 5 } = req.body;
      if (!lat || !lng) return res.status(400).json({ message: "Location required" });
      
      const centers = await RecyclingCenter.find();
      let nearest: any = null;
      let minDist = Infinity;
      
      for (const c of centers) {
        if (!c.location?.lat || !c.location?.lng) continue;
        const dist = haversineKm(lat, lng, c.location.lat, c.location.lng);
        if (dist < minDist) { 
          minDist = dist; 
          nearest = c; 
        }
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
  }

  static async ratePickup(req: Request, res: Response) {
    try {
      const { stars, review } = req.body;
      if (!stars || stars < 1 || stars > 5) {
        return res.status(400).json({ message: "Stars must be 1–5" });
      }
      
      const pickup = await Pickup.findOne({ 
        _id: req.params.id, 
        userId: (req as any).user.id, 
        status: 'completed' 
      });
      
      if (!pickup) return res.status(404).json({ message: "Completed pickup not found" });
      if (pickup.rating?.stars) return res.status(400).json({ message: "Already rated" });
      
      pickup.rating = { stars, review: review || '', ratedAt: new Date() };
      await pickup.save();
      
      // Update collector rating
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
  }

  static async uploadProof(req: Request, res: Response) {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ message: 'imageUrl is required' });
      
      const pickup = await Pickup.findById(req.params.pickupId);
      if (!pickup) return res.status(404).json({ message: 'Pickup not found' });
      if (pickup.collectorId?.toString() !== (req as any).user.id) {
        return res.status(403).json({ message: 'You can only upload proof for your own deliveries' });
      }
      
      if (!pickup.deliveryProofImages) pickup.deliveryProofImages = [];
      if (!pickup.deliveryProofImages.includes(imageUrl)) {
        pickup.deliveryProofImages.push(imageUrl);
      }
      await pickup.save();
      
      res.json({ message: 'Delivery proof uploaded successfully', images: pickup.deliveryProofImages });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default PickupController;
