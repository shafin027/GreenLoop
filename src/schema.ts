import { pgTable, text, timestamp, boolean, integer, json, doublePrecision, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// INDEPENDENT TABLES

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  role: text('role').default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  badgeName: text('badge_name').notNull(),
  description: text('description'),
  iconURL: text('icon_url'),
  targetRole: text('target_role').default('user'),
  criteria: json('criteria'), 
});

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  address: text('address'),
  location: json('location'),
  carbonCreditsPurchased: integer('carbon_credits_purchased').default(0),
  badges: json('badges').default([]),
  role: text('role').default('business'),
  verified: boolean('verified').default(false),
  isBanned: boolean('is_banned').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const collectors = pgTable('collectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  assignedArea: text('assigned_area'),
  totalWeightCollected: doublePrecision('total_weight_collected').default(0),
  totalPickups: integer('total_pickups').default(0),
  totalEarnings: doublePrecision('total_earnings').default(0),
  weeklyPickups: integer('weekly_pickups').default(0),
  weeklyEarnings: doublePrecision('weekly_earnings').default(0),
  weeklyBonusEarned: doublePrecision('weekly_bonus_earned').default(0),
  weekResetDate: timestamp('week_reset_date').defaultNow(),
  performanceRating: doublePrecision('performance_rating').default(5.0),
  totalRatings: integer('total_ratings').default(0),
  ratingSum: doublePrecision('rating_sum').default(0),
  badges: json('badges').default([]),
  role: text('role').default('collector'),
  verified: boolean('verified').default(false),
  isBanned: boolean('is_banned').default(false),
  currentLocation: json('current_location'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const communityEvents = pgTable('community_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  date: timestamp('date'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  location: text('location'),
  imageURL: text('image_url'),
  offerings: json('offerings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const recyclingCenters = pgTable('recycling_centers', {
  id: uuid('id').defaultRandom().primaryKey(),
  centerName: text('center_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  licenseNumber: text('license_number'),
  address: text('address'),
  location: json('location'),
  totalWasteProcessed: doublePrecision('total_waste_processed').default(0),
  totalCarbonReduced: doublePrecision('total_carbon_reduced').default(0),
  carbonCreditsBalance: doublePrecision('carbon_credits_balance').default(0),
  badges: json('badges').default([]),
  role: text('role').default('recycling_center'),
  isApproved: boolean('is_approved').default(false),
  isBanned: boolean('is_banned').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  location: json('location'),
  ecoPoints: integer('eco_points').default(0),
  totalCO2Reduced: doublePrecision('total_co2_reduced').default(0),
  badges: json('badges').default([]),
  sustainabilityScore: doublePrecision('sustainability_score').default(0),
  isBanned: boolean('is_banned').default(false),
  carbonCreditsBalance: integer('carbon_credits_balance').default(0),
  verified: boolean('verified').default(false),
  role: text('role').default('user'),
  redeemedRewards: json('redeemed_rewards').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// FIRST LEVEL DEPENDENT TABLES

export const carbonCredits = pgTable('carbon_credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id),
  centerId: uuid('center_id').references(() => recyclingCenters.id),
  amount: doublePrecision('amount').notNull(),
  price: doublePrecision('price').notNull(),
  status: text('status').default('available'),
  source: text('source'),
  purchaseDate: timestamp('purchase_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  issuedToId: text('issued_to_id').notNull(),
  issuedToType: text('issued_to_type').notNull(),
  certificateType: text('certificate_type').notNull(),
  issueDate: timestamp('issue_date').defaultNow(),
  expiryDate: timestamp('expiry_date'),
  verifiedData: json('verified_data'),
  certificateURL: text('certificate_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const earningsHistory = pgTable('earnings_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectorId: uuid('collector_id').references(() => collectors.id),
  day: text('day').notNull(),
  earnings: doublePrecision('earnings').default(0),
  pickups: integer('pickups').default(0),
  bonus: doublePrecision('bonus').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const eventParticipants = pgTable('event_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => communityEvents.id),
  userId: uuid('user_id').references(() => users.id),
  role: text('role'),
  offering: text('offering'),
  discount: text('discount'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wasteLogs = pgTable('waste_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  centerId: uuid('center_id').references(() => recyclingCenters.id),
  category: text('category').notNull(),
  weight: doublePrecision('weight').notNull(),
  carbonCreditsEarned: doublePrecision('carbon_credits_earned').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sustainabilityScores = pgTable('sustainability_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  score: doublePrecision('score').notNull(),
  calculationDate: timestamp('calculation_date').defaultNow(),
  factors: json('factors'),
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  images: json('images').default([]),
  isApproved: boolean('is_approved').default(true),
  likes: integer('likes').default(0),
  likedBy: json('liked_by').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const postReactions = pgTable('post_reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reactionType: text('reaction_type').notNull(), // 'like' | 'love' | 'celebrate' | 'eco' | 'wow'
  createdAt: timestamp('created_at').defaultNow(),
});

export const pickups = pgTable('pickups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  collectorId: uuid('collector_id').references(() => collectors.id),
  centerId: uuid('center_id').references(() => recyclingCenters.id),
  wasteType: text('waste_type').notNull(),
  estimatedWeight: doublePrecision('estimated_weight').notNull(),
  actualWeight: doublePrecision('actual_weight').default(0),
  status: text('status').default('pending'),
  pickupDate: timestamp('pickup_date'),
  completedAt: timestamp('completed_at'),
  completionPhoto: text('completion_photo'),
  deliveryProofImages: json('delivery_proof_images').default([]),
  co2Reduced: doublePrecision('co2_reduced').default(0),
  ecoPointsEarned: integer('eco_points_earned').default(0),
  routeOptimized: json('route_optimized'),
  deliveryCharge: doublePrecision('delivery_charge').default(60),
  rating: json('rating'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// SECOND LEVEL DEPENDENT TABLES

export const fraudLogs = pgTable('fraud_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectorId: uuid('collector_id').references(() => collectors.id),
  pickupId: uuid('pickup_id').references(() => pickups.id),
  reason: text('reason'),
  severity: text('severity').default('high'),
  resolved: boolean('resolved').default(false),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const issues = pgTable('issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  pickupId: uuid('pickup_id').references(() => pickups.id),
  userId: uuid('user_id').references(() => users.id),
  collectorId: uuid('collector_id').references(() => collectors.id),
  issueType: text('issue_type').notNull(),
  description: text('description'),
  status: text('status').default('open'),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
