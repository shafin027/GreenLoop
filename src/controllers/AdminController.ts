import { Request, Response } from 'express';
import { User } from '../models/User';
import { Collector } from '../models/Collector';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { Business } from '../models/Business';
import { Pickup } from '../models/Pickup';
import { FraudLog } from '../models/FraudLog';
import { Issue } from '../models/Issue';
import { SustainabilityScore } from '../models/SustainabilityScore';
import { Badge } from '../models/Badge';


export const getSustainabilityScores = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('name email ecoPoints totalCO2Reduced sustainabilityScore');
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const calculateUserSustainabilityScore = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const score = Math.min(100, ((user.ecoPoints || 0) / 100) + ((user.totalCO2Reduced || 0) / 10));
    user.sustainabilityScore = score;
    await user.save();
    await SustainabilityScore.create({ userId, score, factors: { ecoPoints: user.ecoPoints, co2: user.totalCO2Reduced } });
    res.json({ userId, score });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getFraudDetection = async (req: Request, res: Response) => {
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
};

export const resolveFraudLog = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const { notes } = req.body;
    const log = await FraudLog.findById(logId);
    if (!log) return res.status(404).json({ message: 'Fraud log not found' });
    log.resolved = true;
    log.resolvedBy = req.user?.id;
    log.resolvedAt = new Date();
    if (notes) log.notes = notes;
    await log.save();
    res.json({ message: 'Fraud alert resolved successfully', log });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const reopenFraudLog = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const log = await FraudLog.findById(logId);
    if (!log) return res.status(404).json({ message: 'Fraud log not found' });
    log.resolved = false;
    log.resolvedBy = undefined;
    log.resolvedAt = undefined;
    await log.save();
    res.json({ message: 'Fraud alert reopened', log });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select('name email phone ecoPoints carbonCreditsBalance badges sustainabilityScore verified isBanned createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listBusinesses = async (req: Request, res: Response) => {
  try {
    const businesses = await Business.find()
      .select('companyName email phone address location carbonCreditsPurchased badges verified isBanned createdAt')
      .sort({ createdAt: -1 });
    res.json(businesses);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listRecyclingCenters = async (req: Request, res: Response) => {
  try {
    const centers = await RecyclingCenter.find()
      .select('centerName email phone address location carbonCreditsBalance badges isApproved isBanned createdAt')
      .sort({ createdAt: -1 });
    res.json(centers);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyBusiness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const business = await Business.findByIdAndUpdate(id, { verified: true }, { new: true });
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json({ message: 'Business verified successfully', business });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyBusiness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const business = await Business.findByIdAndUpdate(id, { verified: false }, { new: true });
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json({ message: 'Business unverified successfully', business });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const banEntity = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEntity = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyRecyclingCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    const center = await RecyclingCenter.findByIdAndUpdate(id, { isApproved: verified }, { new: true });
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json({ message: `Center ${verified ? 'verified' : 'unverified'} successfully`, center });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getHeatmapData = async (req: Request, res: Response) => {
  try {
    const pickups = await Pickup.find({ status: 'completed' }).populate('userId', 'location');
    const heatmapData = pickups.map((p) => ({
      location: (p as any).userId?.location,
      weight: p.actualWeight
    })).filter((d) => d.location);
    res.json(heatmapData);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const completedPickups = await Pickup.find({ status: 'completed' });
    const totalWaste = completedPickups.reduce((sum, p) => sum + (p.actualWeight || 0), 0);
    const totalCO2 = completedPickups.reduce((sum, p) => sum + (p.co2Reduced || 0), 0);
    const activeUsers = await User.countDocuments();
    const totalCollectors = await Collector.countDocuments();
    const fraudLogs = await FraudLog.find({ resolved: false }).limit(5).populate('collectorId', 'name');
    const issues = await Issue.find({ status: 'open' }).limit(5).populate('userId', 'name');

    res.json({
      totalWaste,
      totalCO2,
      activeUsers: activeUsers || 0,
      totalCollectors,
      fraudLogs: fraudLogs?.map((l) => ({ ...l.toObject(), collectorId: l.collectorId })) || [],
      issues: issues?.map((i) => ({ ...i.toObject(), userId: i.userId })) || []
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadgeToCenter = async (req: Request, res: Response) => {
  try {
    const { centerId, badgeName } = req.body;
    const center = await RecyclingCenter.findById(centerId);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    if (!center.badges.includes(badgeName)) {
      center.badges.push(badgeName);
      await center.save();
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${center.centerName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const awardBadgeToBusiness = async (req: Request, res: Response) => {
  try {
    const { businessId, badgeName } = req.body;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (!business.badges.includes(badgeName)) {
      business.badges.push(badgeName);
      await business.save();
    }
    res.json({ message: `Badge "${badgeName}" awarded to ${business.companyName}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyCollector = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collector = await Collector.findByIdAndUpdate(id, { verified: true }, { new: true });
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json({ message: `Collector verified successfully`, collector });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyCollector = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collector = await Collector.findByIdAndUpdate(id, { verified: false }, { new: true });
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json({ message: `Collector unverified successfully`, collector });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { verified: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User verified successfully`, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const unverifyUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { verified: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User unverified successfully`, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
