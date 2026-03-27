-- SQL Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  location JSONB,
  "ecoPoints" INTEGER DEFAULT 0,
  "totalCO2Reduced" DECIMAL DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  "sustainabilityScore" DECIMAL DEFAULT 0,
  role TEXT DEFAULT 'user',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Collectors Table
CREATE TABLE IF NOT EXISTS collectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  "assignedArea" TEXT,
  "totalWeightCollected" DECIMAL DEFAULT 0,
  "totalPickups" INTEGER DEFAULT 0,
  "performanceRating" DECIMAL DEFAULT 5.0,
  role TEXT DEFAULT 'collector',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'admin',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Centers Table
CREATE TABLE IF NOT EXISTS recycling_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "centerName" TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  "licenseNumber" TEXT,
  address TEXT,
  "totalWasteProcessed" DECIMAL DEFAULT 0,
  "totalCarbonReduced" DECIMAL DEFAULT 0,
  role TEXT DEFAULT 'recycling_center',
  "isApproved" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "companyName" TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  "carbonCreditsPurchased" DECIMAL DEFAULT 0,
  role TEXT DEFAULT 'business',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Carbon Credits Table (Marketplace Simulation)
CREATE TABLE IF NOT EXISTS carbon_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "businessId" UUID REFERENCES businesses(id),
  amount DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  status TEXT DEFAULT 'available', -- available, purchased
  "purchaseDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "issuedToId" UUID NOT NULL, -- Can be userId, collectorId, centerId, or businessId
  "issuedToType" TEXT NOT NULL, -- user, collector, recycling_center, business
  "certificateType" TEXT NOT NULL, -- recycling, carbon_offset, performance
  "issueDate" TIMESTAMPTZ DEFAULT NOW(),
  "expiryDate" TIMESTAMPTZ,
  "verifiedData" JSONB,
  "certificateURL" TEXT
);

-- Sustainability Scores Table (History)
CREATE TABLE IF NOT EXISTS sustainability_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id),
  score DECIMAL NOT NULL,
  "calculationDate" TIMESTAMPTZ DEFAULT NOW(),
  "factors" JSONB -- breakdown of the score
);

-- Pickups Table
CREATE TABLE IF NOT EXISTS pickups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id),
  "collectorId" UUID REFERENCES collectors(id),
  "wasteType" TEXT NOT NULL,
  "estimatedWeight" DECIMAL NOT NULL,
  "actualWeight" DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  "pickupDate" TIMESTAMPTZ,
  "completionTime" TIMESTAMPTZ,
  "co2Reduced" DECIMAL DEFAULT 0,
  "ecoPointsEarned" INTEGER DEFAULT 0,
  "routeOptimized" JSONB, -- Optimized route data
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Issues Table
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "pickupId" UUID REFERENCES pickups(id),
  "userId" UUID REFERENCES users(id),
  "collectorId" UUID REFERENCES collectors(id),
  "issueType" TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "badgeName" TEXT NOT NULL,
  description TEXT,
  "iconURL" TEXT,
  criteria JSONB
);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "authorId" UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  "isApproved" BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud Logs Table
CREATE TABLE IF NOT EXISTS fraud_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "collectorId" UUID REFERENCES collectors(id),
  reason TEXT,
  severity TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- RPC for incrementing likes
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET likes = likes + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;

-- Policies for 'users' table
CREATE POLICY "Allow anon to insert users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update users" ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'collectors' table
CREATE POLICY "Allow anon to insert collectors" ON collectors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select collectors" ON collectors FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update collectors" ON collectors FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'admins' table
CREATE POLICY "Allow anon to insert admins" ON admins FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select admins" ON admins FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update admins" ON admins FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'recycling_centers' table
CREATE POLICY "Allow anon to insert recycling_centers" ON recycling_centers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select recycling_centers" ON recycling_centers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update recycling_centers" ON recycling_centers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'businesses' table
CREATE POLICY "Allow anon to insert businesses" ON businesses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select businesses" ON businesses FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update businesses" ON businesses FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'carbon_credits' table
CREATE POLICY "Allow anon to insert carbon_credits" ON carbon_credits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select carbon_credits" ON carbon_credits FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update carbon_credits" ON carbon_credits FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'certificates' table
CREATE POLICY "Allow anon to insert certificates" ON certificates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select certificates" ON certificates FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update certificates" ON certificates FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'sustainability_scores' table
CREATE POLICY "Allow anon to insert sustainability_scores" ON sustainability_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select sustainability_scores" ON sustainability_scores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update sustainability_scores" ON sustainability_scores FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'pickups' table
CREATE POLICY "Allow anon to insert pickups" ON pickups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select pickups" ON pickups FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update pickups" ON pickups FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'issues' table
CREATE POLICY "Allow anon to insert issues" ON issues FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select issues" ON issues FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update issues" ON issues FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'badges' table
CREATE POLICY "Allow anon to select badges" ON badges FOR SELECT TO anon USING (true);

-- Policies for 'posts' table
CREATE POLICY "Allow anon to insert posts" ON posts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select posts" ON posts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update posts" ON posts FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policies for 'fraud_logs' table
CREATE POLICY "Allow anon to insert fraud_logs" ON fraud_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to select fraud_logs" ON fraud_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to update fraud_logs" ON fraud_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
