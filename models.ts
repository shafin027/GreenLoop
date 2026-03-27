export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location?: { lat: number; lng: number };
  ecoPoints: number;
  totalCO2Reduced: number;
  badges: string[];
  sustainabilityScore: number;
  role: string;
  createdAt: string;
}

export interface Collector {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedArea?: string;
  totalWeightCollected: number;
  totalPickups: number;
  performanceRating: number;
  createdAt: string;
}

export interface Pickup {
  id: string;
  userId: string;
  collectorId?: string;
  wasteType: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'ewaste';
  estimatedWeight: number;
  actualWeight: number;
  status: 'pending' | 'on-the-way' | 'arrived' | 'completed' | 'failed';
  pickupDate: string;
  completionTime?: string;
  co2Reduced: number;
  ecoPointsEarned: number;
  routeOptimized?: any;
  createdAt: string;
}

export interface RecyclingCenter {
  id: string;
  centerName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  address: string;
  totalWasteProcessed: number;
  totalCarbonReduced: number;
  role: 'recycling_center';
  isApproved: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  carbonCreditsPurchased: number;
  role: 'business';
  createdAt: string;
}

export interface CarbonCredit {
  id: string;
  businessId?: string;
  amount: number;
  price: number;
  status: 'available' | 'purchased';
  purchaseDate?: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  issuedToId: string;
  issuedToType: 'user' | 'collector' | 'recycling_center' | 'business';
  certificateType: 'recycling' | 'carbon_offset' | 'performance';
  issueDate: string;
  expiryDate?: string;
  verifiedData: any;
  certificateURL?: string;
}

export interface SustainabilityScore {
  id: string;
  userId: string;
  score: number;
  calculationDate: string;
  factors: any;
}

export interface Issue {
  id: string;
  pickupId: string;
  userId: string;
  collectorId?: string;
  issueType: 'late-collector' | 'incorrect-weight' | 'not-collected';
  description?: string;
  status: 'open' | 'in-review' | 'resolved';
  resolutionNote?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  badgeName: string;
  description: string;
  iconURL: string;
  criteria: {
    type: 'ecoPoints' | 'co2Reduced' | 'pickupsCompleted';
    threshold: number;
  };
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string;
  images: string[];
  isApproved: boolean;
  likes: number;
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super-admin' | 'moderator';
}

export interface FraudLog {
  id: string;
  collectorId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  createdAt: string;
}
