import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import {
  connectDB, User, Collector, Admin, RecyclingCenter, Business,
  CarbonCredit, Certificate, SustainabilityScore, Pickup, Issue,
  Badge, Post, FraudLog, CommunityEvent, EventParticipant,
  WasteLog, EarningsHistory
} from "./mongoClient";
import { authenticateToken, authorizeRole } from "./middleware";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "greenloop_secret_key_2026";

// Weekly milestone bonus table (pickups in a week -> bonus amount)
const WEEKLY_MILESTONES = [
  { pickups: 5, bonus: 50 },
  { pickups: 10, bonus: 150 },
  { pickups: 20, bonus: 400 },
];

// Carbon credits per kg — varies by waste type (harder to recycle = more valuable)
const CARBON_CREDIT_RATES: Record<string, number> = {
  ewaste:  1.5,  // E-waste: highest impact, rarest recyclable
  metal:   1.0,  // Metal: high value recyclable
  plastic: 0.8,  // Plastic: important to divert from landfill
  glass:   0.4,  // Glass: lower priority
  paper:   0.3,  // Paper: abundant
  organic: 0.2,  // Organic: compost value
};
const DEFAULT_CREDIT_RATE = 0.5;

// Eco points per kg of waste for users
const ECO_POINTS_RATE = 10; // 10 points per kg

// User carbon credits per pickup completed
const USER_CREDITS_PER_PICKUP = 5;

// Delivery charge formula: ৳60 minimum, +৳20/km after 3km, +৳5/kg over 5kg
function calcDeliveryCharge(distanceKm: number, weightKg: number = 0): number {
  const distCharge = distanceKm <= 3 ? 60 : Math.round(60 + (distanceKm - 3) * 20);
  const weightCharge = weightKg > 5 ? Math.round((weightKg - 5) * 5) : 0;
  return distCharge + weightCharge;
}

// Haversine distance between two lat/lng points in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: check and award badges automatically
async function checkAndAwardUserBadges(userId: string) {
  try {
    const user = await User.findById(userId);
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
      }
    }
    await user.save();
  } catch (err) {
    console.error('Badge check error:', err);
  }
}

async function checkAndAwardCollectorBadges(collectorId: string) {
  try {
    const collector = await Collector.findById(collectorId);
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
      }
    }
    await collector.save();
  } catch (err) {
    console.error('Collector badge check error:', err);
  }
}

async function checkAndAwardCenterBadges(centerId: string) {
  try {
    const center = await RecyclingCenter.findById(centerId);
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
      }
    }
    await center.save();
  } catch (err) {
    console.error('Center badge check error:', err);
  }
}

// Reset weekly stats if a new week has started
async function checkWeekReset(collector: any) {
  const now = new Date();
  const resetDate = new Date(collector.weekResetDate);
  const diffDays = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 7) {
    collector.weeklyPickups = 0;
    collector.weeklyEarnings = 0;
    collector.weeklyBonusEarned = 0;
    collector.weekResetDate = now;
  }
  return collector;
}

async function startServer() {
  const app = express();
  const PORT = 5000;

  await connectDB();

  // ── Seed Data ──────────────────────────────────────────────────────────────
  const seedData = async () => {
    // Always upsert all badges so new badge definitions are added without wiping existing ones
    const allBadgeDefs = [
      // User badges
      { badgeName: "Eco Starter", description: "Complete your first pickup", iconURL: "https://cdn-icons-png.flaticon.com/512/2910/2910756.png", targetRole: 'user', criteria: { type: 'pickupsCompleted', threshold: 1 } },
      { badgeName: "Carbon Warrior", description: "Reduce 10kg of CO2", iconURL: "https://cdn-icons-png.flaticon.com/512/1598/1598196.png", targetRole: 'user', criteria: { type: 'co2Reduced', threshold: 10 } },
      { badgeName: "Point Master", description: "Earn 1000 Eco-Points", iconURL: "https://cdn-icons-png.flaticon.com/512/2166/2166951.png", targetRole: 'user', criteria: { type: 'ecoPoints', threshold: 1000 } },
      { badgeName: "Credit Collector", description: "Earn 25 Carbon Credits", iconURL: "https://cdn-icons-png.flaticon.com/512/3135/3135706.png", targetRole: 'user', criteria: { type: 'carbonCredits', threshold: 25 } },
      { badgeName: "Eco Champion", description: "Complete 10 pickups", iconURL: "https://cdn-icons-png.flaticon.com/512/3176/3176372.png", targetRole: 'user', criteria: { type: 'pickupsCompleted', threshold: 10 } },
      // Collector badges
      { badgeName: "Quick Start", description: "Complete your first delivery", iconURL: "https://cdn-icons-png.flaticon.com/512/1048/1048313.png", targetRole: 'collector', criteria: { type: 'pickupsCompleted', threshold: 1 } },
      { badgeName: "Delivery Pro", description: "Complete 10 deliveries", iconURL: "https://cdn-icons-png.flaticon.com/512/3456/3456426.png", targetRole: 'collector', criteria: { type: 'pickupsCompleted', threshold: 10 } },
      { badgeName: "Weekly Star", description: "Complete 5 deliveries in a week", iconURL: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png", targetRole: 'collector', criteria: { type: 'weeklyPickups', threshold: 5 } },
      { badgeName: "High Earner", description: "Earn ৳500 in total delivery charges", iconURL: "https://cdn-icons-png.flaticon.com/512/584/584052.png", targetRole: 'collector', criteria: { type: 'totalEarnings', threshold: 500 } },
      // Center badges (auto-awarded based on completed pickups by collectors)
      { badgeName: "Waste Processor", description: "Process 10 completed pickups from collectors", iconURL: "https://cdn-icons-png.flaticon.com/512/3456/3456426.png", targetRole: 'recycling_center', criteria: { type: 'pickupsProcessed', threshold: 10 } },
      { badgeName: "Volume Champion", description: "Collect 100kg of waste through collectors", iconURL: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png", targetRole: 'recycling_center', criteria: { type: 'totalWasteKg', threshold: 100 } },
      { badgeName: "Diversity Expert", description: "Collect 3+ different waste types from collectors", iconURL: "https://cdn-icons-png.flaticon.com/512/1598/1598196.png", targetRole: 'recycling_center', criteria: { type: 'wasteTypeDiversity', threshold: 3 } },
      // Center & Business badges (manually awarded by admin)
      { badgeName: "Green Certified", description: "Certified green recycling center", iconURL: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png", targetRole: 'recycling_center', criteria: null },
      { badgeName: "Eco Partner", description: "Eco-friendly business partner", iconURL: "https://cdn-icons-png.flaticon.com/512/2910/2910756.png", targetRole: 'business', criteria: null },
      { badgeName: "Sustainability Leader", description: "Leading in sustainable practices", iconURL: "https://cdn-icons-png.flaticon.com/512/3135/3135783.png", targetRole: 'business', criteria: null },
      { badgeName: "Carbon Neutral", description: "Committed to carbon-neutral operations", iconURL: "https://cdn-icons-png.flaticon.com/512/1598/1598196.png", targetRole: 'business', criteria: null },
    ];
    await Badge.bulkWrite(
      allBadgeDefs.map(def => ({
        updateOne: {
          filter: { badgeName: def.badgeName },
          update: { $setOnInsert: def },
          upsert: true
        }
      }))
    );
    console.log("Badges upserted");

    const centerCount = await RecyclingCenter.countDocuments();
    if (centerCount === 0) {
      const hashedPassword = await bcrypt.hash("center123", 10);
      await RecyclingCenter.insertMany([
        { centerName: "GreenWay Recycling", email: "center1@greenloop.com", password: hashedPassword, phone: "1234567890", licenseNumber: "RC-001", address: "123 Eco St, Green City", role: 'recycling_center' },
        { centerName: "PureCycle Hub", email: "center2@greenloop.com", password: hashedPassword, phone: "0987654321", licenseNumber: "RC-002", address: "456 Clean Ave, Blue Town", role: 'recycling_center' },
      ]);
      console.log("Recycling centers seeded");
    }

    const creditCount = await CarbonCredit.countDocuments();
    if (creditCount === 0) {
      await CarbonCredit.insertMany([
        { amount: 10, price: 500, status: 'available', source: 'GreenWay Recycling' },
        { amount: 25, price: 1200, status: 'available', source: 'PureCycle Hub' },
        { amount: 50, price: 2300, status: 'available', source: 'GreenWay Recycling' },
      ]);
      console.log("Carbon credits seeded");
    }
  };

  try {
    console.log("Attempting to connect to MongoDB...");
    await seedData();
    console.log("Successfully connected to MongoDB");
  } catch (err: any) {
    console.error("CRITICAL: MongoDB connection or seeding failed!");
    console.error("Error Message:", err.message);
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ── Health Check ────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "mongodb", timestamp: new Date().toISOString() });
  });

  // ── Auth Routes ─────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, companyName, centerName, email, password, phone, role, licenseNumber, address } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      let user: any;
      if (role === 'collector') {
        user = await Collector.create({ name, email, password: hashedPassword, phone, role: 'collector' });
      } else if (role === 'admin') {
        user = await Admin.create({ name, email, password: hashedPassword, phone, role: 'admin' });
      } else if (role === 'recycling_center') {
        user = await RecyclingCenter.create({ centerName, email, password: hashedPassword, phone, licenseNumber, address, role: 'recycling_center' });
      } else if (role === 'business') {
        user = await Business.create({ companyName, email, password: hashedPassword, phone, role: 'business' });
      } else {
        user = await User.create({ name, email, password: hashedPassword, phone, role: 'user' });
      }
      res.status(201).json({ message: "Registration successful" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      let user: any;
      if (role === 'collector') user = await Collector.findOne({ email });
      else if (role === 'admin') user = await Admin.findOne({ email });
      else if (role === 'recycling_center') user = await RecyclingCenter.findOne({ email });
      else if (role === 'business') user = await Business.findOne({ email });
      else user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (user.isBanned) {
        return res.status(403).json({ message: "Your account has been banned. Please contact support." });
      }
      const token = jwt.sign(
        { id: user._id, role: role || user.role || 'user', email: user.email },
        JWT_SECRET, { expiresIn: '24h' }
      );
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name || user.centerName || user.companyName,
          email: user.email,
          role: role || user.role || 'user'
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── User Routes ─────────────────────────────────────────────────────────────
  app.get("/api/users/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/me", authenticateToken, async (req: any, res) => {
    try {
      const { name, phone, location } = req.body;
      const user = await User.findByIdAndUpdate(req.user.id, { name, phone, location }, { new: true });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/me/pickups", authenticateToken, async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ userId: req.user.id })
        .populate('collectorId', 'name phone performanceRating totalRatings')
        .populate('centerId', 'centerName address')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User rates a completed pickup's collector
  app.post("/api/pickups/:id/rate", authenticateToken, async (req: any, res) => {
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
  });

  // User badge progress (based only on completed pickups by collectors)
  app.get("/api/users/me/badge-progress", authenticateToken, async (req: any, res) => {
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
  });

  // Estimate delivery charge for a given user location + weight (finds nearest center)
  app.post("/api/pickups/estimate-charge", authenticateToken, async (req: any, res) => {
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
  });

  // User manually claims a badge (only awarded if criteria met based on completed pickups)
  app.post("/api/users/me/claim-badge", authenticateToken, async (req: any, res) => {
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
  });

  app.post("/api/users/me/redeem-reward", authenticateToken, async (req: any, res) => {
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
  });

  app.get("/api/users/me/redeemed-rewards", authenticateToken, async (req: any, res) => {
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
  });

  // ── Pickup Routes ───────────────────────────────────────────────────────────
  app.post("/api/pickups/schedule", authenticateToken, async (req: any, res) => {
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
  });

  // ── Recycling Center Routes ─────────────────────────────────────────────────

  // Center badge progress — based only on completed pickups by collectors
  app.get("/api/recycling-centers/badge-progress", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const center = await RecyclingCenter.findById(req.user.id);
      if (!center) return res.status(404).json({ message: "Center not found" });
      const allBadges = await Badge.find({ targetRole: 'recycling_center', criteria: { $ne: null } });
      const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed' });
      const completedCount = completedPickups.length;
      const totalKg = completedPickups.reduce((sum, p: any) => sum + (p.actualWeight || p.estimatedWeight || 0), 0);
      const wasteTypes = new Set(completedPickups.map((p: any) => p.wasteType));
      const wasteBreakdown = completedPickups.reduce((acc: any, p: any) => {
        acc[p.wasteType] = (acc[p.wasteType] || 0) + (p.actualWeight || p.estimatedWeight || 0);
        return acc;
      }, {});
      const progress = allBadges.map((badge) => {
        let current = 0;
        if (badge.criteria?.type === 'pickupsProcessed') current = completedCount;
        else if (badge.criteria?.type === 'totalWasteKg') current = totalKg;
        else if (badge.criteria?.type === 'wasteTypeDiversity') current = wasteTypes.size;
        const threshold = badge.criteria?.threshold || 0;
        return {
          _id: badge._id,
          badgeName: badge.badgeName,
          description: badge.description,
          iconURL: badge.iconURL,
          criteria: badge.criteria,
          current: Math.round(current),
          threshold,
          earned: center.badges.includes(badge.badgeName),
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
  });

  app.get("/api/recycling-centers/me", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const center = await RecyclingCenter.findById(req.user.id);
      if (!center) return res.status(404).json({ message: "Center not found" });
      res.json(center);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Center updates their own profile (address, phone, location)
  app.put("/api/recycling-centers/me", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const { address, phone, location } = req.body;
      const updates: any = {};
      if (address !== undefined) updates.address = address;
      if (phone !== undefined) updates.phone = phone;
      if (location?.lat && location?.lng) updates.location = location;
      const center = await RecyclingCenter.findByIdAndUpdate(req.user.id, updates, { new: true });
      if (!center) return res.status(404).json({ message: "Center not found" });
      res.json(center);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // All registered centers can see ALL pending pickups (live feed)
  app.get("/api/recycling-centers/pending-pickups", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ status: 'pending' })
        .populate('userId', 'name phone location')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Center accepts a pending pickup — calculates distance-based delivery charge
  app.post("/api/recycling-centers/accept-pickup/:id", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const pickup = await Pickup.findOne({ _id: req.params.id, status: 'pending' }).populate('userId', 'location');
      if (!pickup) return res.status(404).json({ message: "Pickup not found or already accepted" });
      const center = await RecyclingCenter.findById(req.user.id);
      if (!center?.isApproved) return res.status(403).json({ message: "Your center must be verified by an admin before you can accept pickups." });
      const userLoc = (pickup.userId as any)?.location;
      const centerLoc = center?.location;
      let charge = 60; // default minimum
      if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
        const distKm = haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng);
        charge = calcDeliveryCharge(distKm, pickup.estimatedWeight || 0);
      }
      pickup.status = 'accepted_by_center';
      pickup.centerId = req.user.id;
      pickup.deliveryCharge = charge;
      await pickup.save();
      res.json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Center's accepted pickups (their own)
  app.get("/api/recycling-centers/my-pickups", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ centerId: req.user.id })
        .populate('userId', 'name phone')
        .populate('collectorId', 'name phone')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // How much waste is available to log per type (delivered by collectors but not yet logged)
  app.get("/api/recycling-centers/available-waste", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed' });
      const deliveredByType: Record<string, number> = {};
      for (const p of completedPickups) {
        const t = p.wasteType || 'other';
        deliveredByType[t] = (deliveredByType[t] || 0) + (p.actualWeight || p.estimatedWeight || 0);
      }
      const logs = await WasteLog.find({ centerId: req.user.id });
      const loggedByType: Record<string, number> = {};
      for (const l of logs) {
        loggedByType[l.category] = (loggedByType[l.category] || 0) + l.weight;
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
  });

  // Log waste processed → earns carbon credits
  app.post("/api/recycling-centers/log-waste", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const { category, weight } = req.body;
      const center = await RecyclingCenter.findById(req.user.id);
      if (!center) return res.status(404).json({ message: "Center not found" });
      if (!center.isApproved) return res.status(403).json({ message: "Your center must be verified by an admin before logging waste." });

      // Check weight doesn't exceed what was actually delivered for this waste type
      const completedPickups = await Pickup.find({ centerId: req.user.id, status: 'completed', wasteType: category });
      const totalDelivered = completedPickups.reduce((s: number, p: any) => s + (p.actualWeight || p.estimatedWeight || 0), 0);
      const alreadyLogged = await WasteLog.aggregate([
        { $match: { centerId: center._id, category } },
        { $group: { _id: null, total: { $sum: '$weight' } } }
      ]);
      const loggedSoFar = alreadyLogged[0]?.total || 0;
      const remaining = totalDelivered - loggedSoFar;
      if (weight > remaining) {
        return res.status(400).json({
          message: `Cannot log ${weight}kg — only ${remaining.toFixed(2)}kg of ${category} has been delivered to your center and not yet logged.`
        });
      }

      const rate = CARBON_CREDIT_RATES[category] ?? DEFAULT_CREDIT_RATE;
      const carbonReduced = weight * 0.8;
      const creditsEarned = Math.ceil(weight * rate);

      center.totalWasteProcessed = (center.totalWasteProcessed || 0) + weight;
      center.totalCarbonReduced = (center.totalCarbonReduced || 0) + carbonReduced;
      center.carbonCreditsBalance = (center.carbonCreditsBalance || 0) + creditsEarned;
      await center.save();

      await WasteLog.create({ centerId: req.user.id, category, weight, carbonCreditsEarned: creditsEarned });

      res.json({ center, creditsEarned, rate, message: `Logged ${weight}kg of ${category}. Earned ${creditsEarned} carbon credits (rate: ${rate}/kg)!` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Center lists carbon credits in the marketplace
  app.post("/api/recycling-centers/list-credits", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const { amount, price, source } = req.body;
      const center = await RecyclingCenter.findById(req.user.id);
      if (!center) return res.status(404).json({ message: "Center not found" });
      if (!center.isApproved) return res.status(403).json({ message: "Your center must be verified before listing credits in the marketplace." });
      if ((center.carbonCreditsBalance || 0) < amount) {
        return res.status(400).json({ message: "Insufficient carbon credits balance" });
      }
      center.carbonCreditsBalance -= amount;
      await center.save();
      const credit = await CarbonCredit.create({
        amount,
        price,
        source: source || center.centerName,
        status: 'available',
        centerId: req.user.id
      });
      res.status(201).json(credit);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Issue certificate
  app.post("/api/recycling-centers/issue-certificate", authenticateToken, authorizeRole(['recycling_center', 'admin']), async (req: any, res) => {
    try {
      const { issuedToId, issuedToType, certificateType, verifiedData } = req.body;
      const cert = await Certificate.create({
        issuedToId, issuedToType, certificateType, verifiedData,
        issueDate: new Date()
      });
      res.status(201).json(cert);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Center awards badge to a business
  app.post("/api/recycling-centers/award-badge", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const { businessId, badgeName } = req.body;
      const business = await Business.findById(businessId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      if (!business.badges.includes(badgeName)) {
        business.badges.push(badgeName);
        await business.save();
      }
      res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all businesses (for center dropdown)
  app.get("/api/businesses/all", authenticateToken, async (req, res) => {
    try {
      const businesses = await Business.find().select('companyName email badges');
      res.json(businesses);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get waste logs for center
  app.get("/api/recycling-centers/waste-logs", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const logs = await WasteLog.find({ centerId: req.user.id }).sort({ createdAt: -1 }).limit(20);
      res.json(logs);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Collector Routes ────────────────────────────────────────────────────────
  app.get("/api/collectors/profile", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const collector = await Collector.findById(req.user.id);
      if (!collector) return res.status(404).json({ message: "Collector not found" });
      res.json(collector);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector pushes their real-time GPS location
  app.post("/api/collectors/update-location", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
      await Collector.findByIdAndUpdate(req.user.id, {
        currentLocation: { lat, lng, updatedAt: new Date() }
      });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Anyone can fetch a collector's last known location (for tracking active pickup)
  app.get("/api/collectors/:id/location", authenticateToken, async (req: any, res) => {
    try {
      const collector = await Collector.findById(req.params.id).select('currentLocation name');
      if (!collector) return res.status(404).json({ message: "Collector not found" });
      res.json({ currentLocation: (collector as any).currentLocation, name: collector.name });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector sees pickups accepted by a center (available to claim)
  app.get("/api/collectors/available-pickups", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ status: 'accepted_by_center', collectorId: null })
        .populate('userId', 'name phone location')
        .populate('centerId', 'centerName address location')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector sees their own assigned pickups
  app.get("/api/collectors/assigned-pickups", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ collectorId: req.user.id, status: { $nin: ['completed', 'failed'] } })
        .populate('userId', 'name phone location')
        .populate('centerId', 'centerName address location')
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector sees their full completed pickup history
  app.get("/api/collectors/history", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const pickups = await Pickup.find({ collectorId: req.user.id, status: { $in: ['completed', 'failed'] } })
        .populate('userId', 'name phone')
        .populate('centerId', 'centerName address')
        .sort({ completedAt: -1, createdAt: -1 });
      res.json(pickups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector claims/accepts a pickup
  app.post("/api/collectors/pickup/assign/:id", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const pickup = await Pickup.findOneAndUpdate(
        { _id: req.params.id, status: 'accepted_by_center', collectorId: null },
        { status: 'accepted_by_collector', collectorId: req.user.id },
        { new: true }
      );
      if (!pickup) return res.status(404).json({ message: "Pickup not available" });
      res.json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector updates pickup status
  app.post("/api/collectors/pickup/update-status/:id", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const { status, actualWeight, completionPhoto } = req.body;
      const pickup = await Pickup.findOne({ _id: req.params.id, collectorId: req.user.id });
      if (!pickup) return res.status(404).json({ message: "Pickup not found" });

      if (status === 'completed') {
        if (!completionPhoto) {
          return res.status(400).json({ message: "Completion photo is required to complete a pickup" });
        }
        const weight = actualWeight || pickup.estimatedWeight;
        const co2Reduced = weight * 0.8;
        const ecoPoints = Math.floor(weight * ECO_POINTS_RATE);

        // Recalculate delivery charge with actual weight if center location is known
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
        // Sync completion photo into deliveryProofImages for fraud detection visibility
        if (!pickup.deliveryProofImages) pickup.deliveryProofImages = [];
        if (!pickup.deliveryProofImages.includes(completionPhoto)) {
          pickup.deliveryProofImages = [completionPhoto];
        }
        await pickup.save();

        // Update collector earnings
        let collector = await Collector.findById(req.user.id);
        if (collector) {
          collector = await checkWeekReset(collector);
          collector.totalPickups = (collector.totalPickups || 0) + 1;
          collector.totalWeightCollected = (collector.totalWeightCollected || 0) + weight;
          const baseCharge = finalCharge;
          collector.totalEarnings = (collector.totalEarnings || 0) + baseCharge;
          collector.weeklyPickups = (collector.weeklyPickups || 0) + 1;
          collector.weeklyEarnings = (collector.weeklyEarnings || 0) + baseCharge;

          // Check weekly milestone bonuses
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

          // Save earnings history entry
          const today = new Date();
          const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
          const existing = await EarningsHistory.findOne({
            collectorId: req.user.id,
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
              collectorId: req.user.id,
              day: dayName,
              earnings: baseCharge + bonusEarned,
              pickups: 1,
              bonus: bonusEarned
            });
          }

          await checkAndAwardCollectorBadges(req.user.id);
        }

        // Award carbon credits and eco points to user
        const user = await User.findById(pickup.userId);
        if (user) {
          user.carbonCreditsBalance = (user.carbonCreditsBalance || 0) + USER_CREDITS_PER_PICKUP;
          user.ecoPoints = (user.ecoPoints || 0) + ecoPoints;
          user.totalCO2Reduced = (user.totalCO2Reduced || 0) + co2Reduced;
          await user.save();
          await checkAndAwardUserBadges(pickup.userId.toString());
        }

        // Auto-award center badges based on completed pickups
        if (pickup.centerId) {
          await checkAndAwardCenterBadges(pickup.centerId.toString());
        }

        // Auto-flag weight mismatch >10% and absolute anomalies
        {
          const estimatedW = pickup.estimatedWeight || 0;
          const mismatchPct = estimatedW > 0 ? Math.abs(weight - estimatedW) / estimatedW : 0;
          const mismatchKg = Math.abs(weight - estimatedW);
          const isMismatch = mismatchPct > 0.10 && mismatchKg > 0.5;
          const isAnomalous = weight > 50;
          if (isMismatch || isAnomalous) {
            const existing = await FraudLog.findOne({ pickupId: pickup._id });
            if (!existing) {
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
              await FraudLog.create({ collectorId: req.user.id, pickupId: pickup._id, reason, severity, resolved: false });
            }
          }
        }

        res.json({ message: "Pickup completed successfully", pickup, bonusEarned: pickup.deliveryCharge });
      } else {
        pickup.status = status;
        await pickup.save();
        res.json(pickup);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Collector earnings chart (last 7 days from DB)
  app.get("/api/collectors/earnings-chart", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
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
          collectorId: req.user.id,
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
  });

  app.get("/api/collectors/rankings", async (req, res) => {
    try {
      const collectors = await Collector.find()
        .select('name totalWeightCollected totalPickups performanceRating totalEarnings verified')
        .sort({ totalPickups: -1 });
      res.json(collectors);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all collectors (for admin)
  app.get("/api/collectors/all", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const collectors = await Collector.find().select('name email totalPickups totalEarnings verified badges weeklyPickups isBanned');
      res.json(collectors);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin verifies/unverifies collector
  app.post("/api/admin/verify-collector/:collectorId", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const collector = await Collector.findByIdAndUpdate(req.params.collectorId, { verified: true }, { new: true });
      if (!collector) return res.status(404).json({ message: "Collector not found" });
      res.json({ message: "Collector verified successfully", collector });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/unverify-collector/:collectorId", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const collector = await Collector.findByIdAndUpdate(req.params.collectorId, { verified: false }, { new: true });
      if (!collector) return res.status(404).json({ message: "Collector not found" });
      res.json({ message: "Collector verification removed", collector });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Business Routes ─────────────────────────────────────────────────────────
  app.get("/api/businesses/me", authenticateToken, authorizeRole(['business']), async (req: any, res) => {
    try {
      const business = await Business.findById(req.user.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      res.json(business);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Business updates their own profile (address, phone, location)
  app.put("/api/businesses/me", authenticateToken, authorizeRole(['business']), async (req: any, res) => {
    try {
      const { address, phone, location } = req.body;
      const updates: any = {};
      if (address !== undefined) updates.address = address;
      if (phone !== undefined) updates.phone = phone;
      if (location?.lat && location?.lng) updates.location = location;
      const business = await Business.findByIdAndUpdate(req.user.id, updates, { new: true });
      if (!business) return res.status(404).json({ message: "Business not found" });
      res.json(business);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/carbon-credits/available", async (req, res) => {
    try {
      const credits = await CarbonCredit.find({ status: 'available' }).populate('centerId', 'centerName');
      res.json(credits);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/businesses/carbon-credits/purchase", authenticateToken, authorizeRole(['business']), async (req: any, res) => {
    try {
      const { creditId } = req.body;
      const credit = await CarbonCredit.findById(creditId);
      if (!credit || credit.status !== 'available') {
        return res.status(400).json({ message: "Credit not available" });
      }
      credit.status = 'purchased';
      credit.businessId = req.user.id;
      credit.purchaseDate = new Date();
      await credit.save();

      const business = await Business.findById(req.user.id);
      if (business) {
        business.carbonCreditsPurchased = (business.carbonCreditsPurchased || 0) + credit.amount;
        await business.save();
      }
      res.json({ message: "Purchase successful", amount: credit.amount });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/certificates/me", authenticateToken, async (req: any, res) => {
    try {
      const certs = await Certificate.find({ issuedToId: req.user.id }).sort({ issueDate: -1 });
      res.json(certs || []);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Badge Routes ────────────────────────────────────────────────────────────
  app.get("/api/badges", async (req, res) => {
    try {
      const badges = await Badge.find();
      res.json(badges);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Admin Routes ────────────────────────────────────────────────────────────
  app.get("/api/admin/sustainability-scores", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const users = await User.find().select('name email ecoPoints totalCO2Reduced sustainabilityScore');
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/calculate-sustainability-score/:userId", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const score = Math.min(100, (user.ecoPoints || 0) / 100 + (user.totalCO2Reduced || 0) / 10);
      user.sustainabilityScore = score;
      await user.save();
      await SustainabilityScore.create({
        userId, score,
        factors: { ecoPoints: user.ecoPoints, co2: user.totalCO2Reduced }
      });
      res.json({ userId, score });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/fraud-detection", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const logs = await FraudLog.find()
        .populate('collectorId', 'name email')
        .populate('pickupId')
        .lean()
        .sort({ createdAt: -1 });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch fraud logs' });
    }
  });

  // Collector uploads delivery proof images for a pickup
  app.post("/api/pickups/:pickupId/upload-proof", authenticateToken, authorizeRole(['collector']), async (req: any, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ message: 'imageUrl is required' });
      
      const pickup = await Pickup.findById(req.params.pickupId);
      if (!pickup) return res.status(404).json({ message: 'Pickup not found' });
      if (pickup.collectorId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only upload proof for your own deliveries' });
      }
      
      if (!pickup.deliveryProofImages) pickup.deliveryProofImages = [];
      pickup.deliveryProofImages.push(imageUrl);
      await pickup.save();
      
      res.json({ message: 'Delivery proof uploaded successfully', images: pickup.deliveryProofImages });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/resolve-fraud/:logId", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { notes } = req.body;
      const log = await FraudLog.findById(req.params.logId);
      if (!log) return res.status(404).json({ message: "Fraud log not found" });
      log.resolved = true;
      log.resolvedBy = req.user.id;
      log.resolvedAt = new Date();
      if (notes) log.notes = notes;
      await log.save();
      res.json({ message: "Fraud alert resolved successfully", log });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/reopen-fraud/:logId", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const log = await FraudLog.findById(req.params.logId);
      if (!log) return res.status(404).json({ message: "Fraud log not found" });
      log.resolved = false;
      log.resolvedBy = undefined;
      log.resolvedAt = undefined;
      await log.save();
      res.json({ message: "Fraud alert reopened", log });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin: list all users
  app.get("/api/admin/users", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const users = await User.find().select('name email phone ecoPoints carbonCreditsBalance badges sustainabilityScore isBanned createdAt').sort({ createdAt: -1 });
      res.json(users);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  // Admin: list all businesses
  app.get("/api/admin/businesses", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const businesses = await Business.find().select('companyName email phone address location carbonCreditsPurchased badges isBanned createdAt').sort({ createdAt: -1 });
      res.json(businesses);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  // Admin: ban or unban any entity
  app.post("/api/admin/ban/:role/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { role, id } = req.params;
      const { banned } = req.body;
      let doc: any;
      if (role === 'user') doc = await User.findByIdAndUpdate(id, { isBanned: banned }, { new: true });
      else if (role === 'collector') doc = await Collector.findByIdAndUpdate(id, { isBanned: banned }, { new: true });
      else if (role === 'recycling_center') doc = await RecyclingCenter.findByIdAndUpdate(id, { isBanned: banned }, { new: true });
      else if (role === 'business') doc = await Business.findByIdAndUpdate(id, { isBanned: banned }, { new: true });
      else return res.status(400).json({ message: 'Unknown role' });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json({ message: `Account ${banned ? 'banned' : 'unbanned'} successfully`, doc });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  // Admin: permanently delete any entity
  app.delete("/api/admin/delete/:role/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { role, id } = req.params;
      let doc: any;
      if (role === 'user') doc = await User.findByIdAndDelete(id);
      else if (role === 'collector') doc = await Collector.findByIdAndDelete(id);
      else if (role === 'recycling_center') doc = await RecyclingCenter.findByIdAndDelete(id);
      else if (role === 'business') doc = await Business.findByIdAndDelete(id);
      else return res.status(400).json({ message: 'Unknown role' });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Account permanently deleted' });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  // Admin: verify (approve) or unverify a recycling center
  app.post("/api/admin/recycling-centers/:id/verify", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { verified } = req.body;
      const center = await RecyclingCenter.findByIdAndUpdate(
        req.params.id,
        { isApproved: verified },
        { new: true }
      );
      if (!center) return res.status(404).json({ message: "Center not found" });
      res.json({ message: `Center ${verified ? 'verified' : 'unverified'} successfully`, center });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/heatmaps", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const pickups = await Pickup.find({ status: 'completed' }).populate('userId', 'location');
      const heatmapData = pickups.map(p => ({
        location: (p as any).userId?.location,
        weight: p.actualWeight
      })).filter(d => d.location);
      res.json(heatmapData);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/dashboard", authenticateToken, authorizeRole(['super-admin', 'admin']), async (req, res) => {
    try {
      const completedPickups = await Pickup.find({ status: 'completed' });
      const totalWaste = completedPickups.reduce((sum, p) => sum + (p.actualWeight || 0), 0);
      const totalCO2 = completedPickups.reduce((sum, p) => sum + (p.co2Reduced || 0), 0);
      const activeUsers = await User.countDocuments();
      const totalCollectors = await Collector.countDocuments();
      const fraudLogs = await FraudLog.find({ resolved: false }).limit(5).populate('collectorId', 'name');
      const issues = await Issue.find({ status: 'open' }).limit(5).populate('userId', 'name');
      res.json({
        totalWaste, totalCO2,
        activeUsers: activeUsers || 0,
        totalCollectors,
        fraudLogs: fraudLogs?.map(l => ({ ...l.toObject(), collectorId: l.collectorId })) || [],
        issues: issues?.map(i => ({ ...i.toObject(), userId: i.userId })) || []
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin awards badge to a recycling center
  app.post("/api/admin/award-badge-to-center", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const { centerId, badgeName } = req.body;
      const center = await RecyclingCenter.findById(centerId);
      if (!center) return res.status(404).json({ message: "Center not found" });
      if (!center.badges.includes(badgeName)) {
        center.badges.push(badgeName);
        await center.save();
      }
      res.json({ message: `Badge "${badgeName}" awarded to ${center.centerName}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin awards badge to a business
  app.post("/api/admin/award-badge-to-business", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req, res) => {
    try {
      const { businessId, badgeName } = req.body;
      const business = await Business.findById(businessId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      if (!business.badges.includes(badgeName)) {
        business.badges.push(badgeName);
        await business.save();
      }
      res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all recycling centers (for admin dropdown)
  app.get("/api/recycling-centers/all", authenticateToken, async (req, res) => {
    try {
      const centers = await RecyclingCenter.find().select('centerName email address badges carbonCreditsBalance isApproved location isBanned');
      res.json(centers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Community Events ────────────────────────────────────────────────────────
  app.get("/api/community/events", async (req, res) => {
    try {
      const events = await CommunityEvent.find().sort({ createdAt: -1 });
      const eventsWithParticipants = await Promise.all(events.map(async (event) => {
        const participantCount = await EventParticipant.countDocuments({ eventId: event._id });
        return { ...event.toObject(), participantCount };
      }));
      res.json(eventsWithParticipants);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/community/events", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { title, description, date, startDate, endDate, location, offerings, imageURL } = req.body;
      const event = await CommunityEvent.create({
        title, description,
        date: date || startDate,
        startDate, endDate,
        location, offerings, imageURL
      });
      res.status(201).json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/community/events/:id/join", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await EventParticipant.findOne({ eventId: id, userId: req.user.id });
      if (existing) return res.status(400).json({ message: "Already joined this event" });
      const participant = await EventParticipant.create({
        eventId: id, userId: req.user.id,
        role: req.user.role
      });
      res.status(201).json(participant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/community/events/my-joined", authenticateToken, async (req: any, res) => {
    try {
      const records = await EventParticipant.find({ userId: req.user.id }).select('eventId');
      res.json(records.map((r: any) => r.eventId.toString()));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/community/events/:id/participants", async (req, res) => {
    try {
      const participants = await EventParticipant.find({ eventId: req.params.id });
      res.json(participants);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/community/events/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { title, description, date, location, offerings, imageURL } = req.body;
      const event = await CommunityEvent.findByIdAndUpdate(
        req.params.id,
        { title, description, date, location, offerings, imageURL },
        { new: true }
      );
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/community/events/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const event = await CommunityEvent.findByIdAndDelete(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      await EventParticipant.deleteMany({ eventId: req.params.id });
      res.json({ message: "Event deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Community Posts ─────────────────────────────────────────────────────────
  app.get("/api/admin/community/posts", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const posts = await Post.find()
        .populate('authorId', 'name email role')
        .sort({ createdAt: -1 });
      res.json(posts.map((p: any) => ({
        ...p.toObject(),
        id: p._id,
        author: p.authorId
      })));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/community/posts/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const { title, content, isApproved } = req.body;
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(isApproved !== undefined && { isApproved }) },
        { new: true }
      );
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/community/posts/:id", authenticateToken, authorizeRole(['admin', 'super-admin']), async (req: any, res) => {
    try {
      const post = await Post.findByIdAndDelete(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json({ message: "Post deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/community/posts", async (req, res) => {
    try {
      const posts = await Post.find({ isApproved: true })
        .populate('authorId', 'name')
        .sort({ createdAt: -1 });
      res.json(posts.map(p => ({
        ...p.toObject(),
        id: p._id,
        author: (p as any).authorId
      })));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/community/posts", authenticateToken, async (req: any, res) => {
    try {
      const { title, content, images } = req.body;
      const post = await Post.create({
        authorId: req.user.id, title, content,
        images: images || [],
        isApproved: true
      });
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/community/posts/like/:id", authenticateToken, async (req: any, res) => {
    try {
      const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Old compat routes ───────────────────────────────────────────────────────
  app.post("/api/pickups/accept-center/:id", authenticateToken, authorizeRole(['recycling_center']), async (req: any, res) => {
    try {
      const pickup = await Pickup.findOne({ _id: req.params.id, status: 'pending' }).populate('userId', 'location');
      if (!pickup) return res.status(404).json({ message: "Pickup not found" });
      const center = await RecyclingCenter.findById(req.user.id);
      const userLoc = (pickup.userId as any)?.location;
      const centerLoc = center?.location;
      let charge = 60;
      if (userLoc?.lat && userLoc?.lng && centerLoc?.lat && centerLoc?.lng) {
        charge = calcDeliveryCharge(haversineKm(userLoc.lat, userLoc.lng, centerLoc.lat, centerLoc.lng), pickup.estimatedWeight || 0);
      }
      pickup.status = 'accepted_by_center';
      pickup.centerId = req.user.id;
      pickup.deliveryCharge = charge;
      await pickup.save();
      res.json(pickup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/collectors/route-optimization/:id", authenticateToken, authorizeRole(['collector']), async (req, res) => {
    try {
      const pickup = await Pickup.findById(req.params.id);
      if (!pickup) return res.status(404).json({ message: "Pickup not found" });
      const optimizedRoute = {
        steps: [
          { instruction: "Head north on Main St", distance: "500m" },
          { instruction: "Turn right onto Eco Blvd", distance: "1.2km" },
          { instruction: "Arrive at destination", distance: "0m" }
        ],
        estimatedTime: "8 mins",
        distance: "1.7km"
      };
      res.json(optimizedRoute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── AI Chat Endpoint ─────────────────────────────────────────────────────────
  app.post('/api/chat', authenticateToken, async (req: any, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: 'messages array is required' });
      }
      
      const apiKey = process.env.OPENROUTER_API || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'placeholder') {
        return res.status(503).json({ message: 'Chatbot is not configured. Please set OPENROUTER_API in environment secrets.' });
      }

      const aiClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
      });

      const systemPrompt = `You are GreenLoop's friendly AI assistant. GreenLoop is a sustainable waste management platform in Bangladesh (currency: ৳ BDT) that connects households, waste collectors, and recycling centers in a unified green economy.

Key features you can help with:
- Waste pickup scheduling: users submit pickups with GPS location sharing + interactive map; delivery charge = ৳60 base (min) + ৳20/km after 3km + ৳5/kg over 5kg; users see estimated charge before scheduling; final charge is recalculated at completion using actual weight
- Collector navigation: after claiming a pickup, collectors see "Navigate to User" and "Navigate to Center" buttons (open Google Maps) plus a visual route map; weekly bonuses: 5 pickups → ৳50, 10 → ৳150, 20 → ৳400
- Eco-points & rewards: users earn 10 eco-points per kg of waste; points redeemable in the Eco Rewards Shop for vouchers and discounts
- Carbon credits: recycling centers earn 0.5 credits/kg processed; users earn 5 credits per completed pickup; credits are tradeable in the Carbon Credit Marketplace
- Badge milestones: users, collectors, and recycling centers earn badges for activity milestones (e.g. "Recycling Rookie", "Carbon Champion")
- Community events: users can join sustainability events and workshops organized through the platform
- Fraud detection: system automatically flags suspicious pickups (>50 kg or >10% weight mismatch) for admin review
- Leaderboard & impact: track collective stats — tons recycled, CO₂ saved, water saved, carbon credits issued

Answer questions about the platform concisely and helpfully. Encourage sustainable habits. If asked something unrelated to GreenLoop or sustainability, gently redirect back to the platform's features.`;

      const completion = await aiClient.chat.completions.create({
        model: 'stepfun/step-3.5-flash:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        reasoning: { enabled: true },
        max_tokens: 500,
      } as any);

      const assistantMessage = completion.choices[0]?.message as any;
      res.json({
        reply: assistantMessage?.content || 'I could not generate a response. Please try again.',
        reasoning_details: assistantMessage?.reasoning_details || null,
      });
    } catch (err: any) {
      console.error('Chat error:', err?.message);
      if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        return res.status(401).json({ message: 'Invalid API key. Please check your API key in environment secrets.' });
      }
      if (err?.status === 402 || err?.message?.includes('402') || err?.message?.includes('credits')) {
        return res.status(402).json({ message: 'Insufficient API credits. Please top up your OpenRouter account at openrouter.ai/settings/credits.' });
      }
      res.status(500).json({ message: 'AI service unavailable. Please try again shortly.' });
    }
  });

  // ── Vite Middleware ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
