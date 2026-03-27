import mongoose, { Schema, Document } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wastego';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: { lat: number; lng: number; address?: string; };
  ecoPoints: number;
  totalCO2Reduced: number;
  badges: string[];
  sustainabilityScore: number;
  carbonCreditsBalance: number;
  role: string;
  createdAt: Date;
  redeemedRewards: { rewardId: number; rewardTitle: string; pointsCost: number; redeemedAt: Date }[];
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  location: { lat: Number, lng: Number, address: String },
  ecoPoints: { type: Number, default: 0 },
  totalCO2Reduced: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  sustainabilityScore: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  carbonCreditsBalance: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  redeemedRewards: {
    type: [{
      rewardId: Number,
      rewardTitle: String,
      pointsCost: Number,
      redeemedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
}, { timestamps: true });

// Collector Schema
export interface ICollector extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  assignedArea?: string;
  totalWeightCollected: number;
  totalPickups: number;
  totalEarnings: number;
  weeklyPickups: number;
  weeklyEarnings: number;
  weeklyBonusEarned: number;
  weekResetDate: Date;
  performanceRating: number;
  totalRatings: number;
  ratingSum: number;
  badges: string[];
  role: string;
  verified: boolean;
  createdAt: Date;
  currentLocation?: { lat: number; lng: number; updatedAt: Date };
}

const collectorSchema = new Schema<ICollector>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  assignedArea: String,
  totalWeightCollected: { type: Number, default: 0 },
  totalPickups: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  weeklyPickups: { type: Number, default: 0 },
  weeklyEarnings: { type: Number, default: 0 },
  weeklyBonusEarned: { type: Number, default: 0 },
  weekResetDate: { type: Date, default: Date.now },
  performanceRating: { type: Number, default: 5.0 },
  totalRatings: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'collector' },
  verified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true });

// Admin Schema
export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  createdAt: Date;
}

const adminSchema = new Schema<IAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, default: 'admin' },
}, { timestamps: true });

// Recycling Center Schema
export interface IRecyclingCenter extends Document {
  centerName: string;
  email: string;
  password: string;
  phone?: string;
  licenseNumber?: string;
  address?: string;
  location?: { lat: number; lng: number };
  totalWasteProcessed: number;
  totalCarbonReduced: number;
  carbonCreditsBalance: number;
  badges: string[];
  role: string;
  isApproved: boolean;
  createdAt: Date;
}

const recyclingCenterSchema = new Schema<IRecyclingCenter>({
  centerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  licenseNumber: String,
  address: String,
  location: { lat: Number, lng: Number },
  totalWasteProcessed: { type: Number, default: 0 },
  totalCarbonReduced: { type: Number, default: 0 },
  carbonCreditsBalance: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'recycling_center' },
  isApproved: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

// Business Schema
export interface IBusiness extends Document {
  companyName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  carbonCreditsPurchased: number;
  badges: string[];
  role: string;
  createdAt: Date;
}

const businessSchema = new Schema<IBusiness>({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  location: { lat: Number, lng: Number },
  carbonCreditsPurchased: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  role: { type: String, default: 'business' },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

// Carbon Credits Schema
export interface ICarbonCredit extends Document {
  businessId?: any;
  centerId?: any;
  amount: number;
  price: number;
  status: string;
  source?: string;
  purchaseDate?: Date;
  createdAt: Date;
}

const carbonCreditSchema = new Schema<ICarbonCredit>({
  businessId: Schema.Types.ObjectId,
  centerId: Schema.Types.ObjectId,
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'available' },
  source: String,
  purchaseDate: Date,
}, { timestamps: true });

// Certificate Schema
export interface ICertificate extends Document {
  issuedToId: string;
  issuedToType: string;
  certificateType: string;
  issueDate: Date;
  expiryDate?: Date;
  verifiedData?: any;
  certificateURL?: string;
}

const certificateSchema = new Schema<ICertificate>({
  issuedToId: { type: String, required: true },
  issuedToType: { type: String, required: true },
  certificateType: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  expiryDate: Date,
  verifiedData: Schema.Types.Mixed,
  certificateURL: String,
}, { timestamps: true });

// Sustainability Score Schema
export interface ISustainabilityScore extends Document {
  userId: any;
  score: number;
  calculationDate: Date;
  factors?: any;
}

const sustainabilityScoreSchema = new Schema<ISustainabilityScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number, required: true },
  calculationDate: { type: Date, default: Date.now },
  factors: Schema.Types.Mixed,
});

// Pickup Schema
export interface IPickup extends Document {
  userId: any;
  collectorId?: any;
  centerId?: any;
  wasteType: string;
  estimatedWeight: number;
  actualWeight: number;
  status: string;
  pickupDate?: Date;
  completedAt?: Date;
  completionPhoto?: string;
  co2Reduced: number;
  ecoPointsEarned: number;
  routeOptimized?: any;
  deliveryCharge: number;
  rating?: { stars: number; review?: string; ratedAt: Date };
  createdAt: Date;
}

const pickupSchema = new Schema<IPickup>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  centerId: { type: Schema.Types.ObjectId, ref: 'RecyclingCenter' },
  wasteType: { type: String, required: true },
  estimatedWeight: { type: Number, required: true },
  actualWeight: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  pickupDate: Date,
  completedAt: Date,
  completionPhoto: String,
  co2Reduced: { type: Number, default: 0 },
  ecoPointsEarned: { type: Number, default: 0 },
  routeOptimized: Schema.Types.Mixed,
  deliveryCharge: { type: Number, default: 60 },
  rating: {
    stars: { type: Number, min: 1, max: 5 },
    review: String,
    ratedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true });

// Issue Schema
export interface IIssue extends Document {
  pickupId: any;
  userId?: any;
  collectorId?: any;
  issueType: string;
  description?: string;
  status: string;
  resolutionNote?: string;
  createdAt: Date;
}

const issueSchema = new Schema<IIssue>({
  pickupId: { type: Schema.Types.ObjectId, ref: 'Pickup' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  issueType: { type: String, required: true },
  description: String,
  status: { type: String, default: 'open' },
  resolutionNote: String,
}, { timestamps: true });

// Badge Schema
export interface IBadge extends Document {
  badgeName: string;
  description?: string;
  iconURL?: string;
  targetRole?: string;
  criteria?: any;
}

const badgeSchema = new Schema<IBadge>({
  badgeName: { type: String, required: true },
  description: String,
  iconURL: String,
  targetRole: { type: String, default: 'user' },
  criteria: Schema.Types.Mixed,
});

// Post Schema
export interface IPost extends Document {
  authorId: any;
  title: string;
  content?: string;
  images: string[];
  isApproved: boolean;
  likes: number;
  createdAt: Date;
}

const postSchema = new Schema<IPost>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  content: String,
  images: { type: [String], default: [] },
  isApproved: { type: Boolean, default: true },
  likes: { type: Number, default: 0 },
}, { timestamps: true });

// Fraud Log Schema
export interface IFraudLog extends Document {
  collectorId: any;
  pickupId?: any;
  reason?: string;
  severity?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

const fraudLogSchema = new Schema<IFraudLog>({
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  pickupId: { type: Schema.Types.ObjectId, ref: 'Pickup' },
  reason: String,
  severity: { type: String, default: 'high' },
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  notes: String,
}, { timestamps: true });

// Community Events Schema
export interface ICommunityEvent extends Document {
  title: string;
  description?: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  imageURL?: string;
  offerings?: any;
  createdAt: Date;
}

const communityEventSchema = new Schema<ICommunityEvent>({
  title: { type: String, required: true },
  description: String,
  date: Date,
  startDate: Date,
  endDate: Date,
  location: String,
  imageURL: String,
  offerings: Schema.Types.Mixed,
}, { timestamps: true });

// Event Participant Schema
export interface IEventParticipant extends Document {
  eventId: any;
  userId: any;
  role?: string;
  offering?: string;
  discount?: string;
  createdAt: Date;
}

const eventParticipantSchema = new Schema<IEventParticipant>({
  eventId: { type: Schema.Types.ObjectId, ref: 'CommunityEvent' },
  userId: Schema.Types.ObjectId,
  role: String,
  offering: String,
  discount: String,
}, { timestamps: true });

// Waste Log Schema (for tracking center's processed waste history)
export interface IWasteLog extends Document {
  centerId: any;
  category: string;
  weight: number;
  carbonCreditsEarned: number;
  createdAt: Date;
}

const wasteLogSchema = new Schema<IWasteLog>({
  centerId: { type: Schema.Types.ObjectId, ref: 'RecyclingCenter' },
  category: String,
  weight: Number,
  carbonCreditsEarned: Number,
}, { timestamps: true });

// Collector Earnings History Schema
export interface IEarningsHistory extends Document {
  collectorId: any;
  day: string;
  earnings: number;
  pickups: number;
  bonus: number;
  createdAt: Date;
}

const earningsHistorySchema = new Schema<IEarningsHistory>({
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  day: String,
  earnings: { type: Number, default: 0 },
  pickups: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
}, { timestamps: true });

// Export Models
export const User = mongoose.model<IUser>('User', userSchema);
export const Collector = mongoose.model<ICollector>('Collector', collectorSchema);
export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
export const RecyclingCenter = mongoose.model<IRecyclingCenter>('RecyclingCenter', recyclingCenterSchema);
export const Business = mongoose.model<IBusiness>('Business', businessSchema);
export const CarbonCredit = mongoose.model<ICarbonCredit>('CarbonCredit', carbonCreditSchema);
export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);
export const SustainabilityScore = mongoose.model<ISustainabilityScore>('SustainabilityScore', sustainabilityScoreSchema);
export const Pickup = mongoose.model<IPickup>('Pickup', pickupSchema);
export const Issue = mongoose.model<IIssue>('Issue', issueSchema);
export const Badge = mongoose.model<IBadge>('Badge', badgeSchema);
export const Post = mongoose.model<IPost>('Post', postSchema);
export const FraudLog = mongoose.model<IFraudLog>('FraudLog', fraudLogSchema);
export const CommunityEvent = mongoose.model<ICommunityEvent>('CommunityEvent', communityEventSchema);
export const EventParticipant = mongoose.model<IEventParticipant>('EventParticipant', eventParticipantSchema);
export const WasteLog = mongoose.model<IWasteLog>('WasteLog', wasteLogSchema);
export const EarningsHistory = mongoose.model<IEarningsHistory>('EarningsHistory', earningsHistorySchema);
