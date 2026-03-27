-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Recycling Centers Table
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
  "isBanned" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='email') THEN 
    ALTER TABLE recycling_centers ADD COLUMN email TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='licenseNumber') THEN 
    ALTER TABLE recycling_centers ADD COLUMN "licenseNumber" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='address') THEN 
    ALTER TABLE recycling_centers ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='password') THEN 
    ALTER TABLE recycling_centers ADD COLUMN password TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='phone') THEN 
    ALTER TABLE recycling_centers ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='role') THEN 
    ALTER TABLE recycling_centers ADD COLUMN role TEXT DEFAULT 'recycling_center';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recycling_centers' AND column_name='isBanned') THEN 
    ALTER TABLE recycling_centers ADD COLUMN "isBanned" BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "companyName" TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  "carbonCreditsPurchased" DECIMAL DEFAULT 0,
  role TEXT DEFAULT 'business',
  "isApproved" BOOLEAN DEFAULT FALSE,
  "isBanned" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Carbon Credits Table (Marketplace Simulation)
CREATE TABLE IF NOT EXISTS carbon_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "businessId" UUID REFERENCES businesses(id),
  "centerId" UUID REFERENCES recycling_centers(id),
  amount DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'available', -- available, purchased
  "purchaseDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Certificates Table
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

-- 5. Sustainability Scores Table (History)
CREATE TABLE IF NOT EXISTS sustainability_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id),
  score DECIMAL NOT NULL,
  "calculationDate" TIMESTAMPTZ DEFAULT NOW(),
  "factors" JSONB -- breakdown of the score
);

-- 6. Issues Table
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

-- 7. Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "badgeName" TEXT NOT NULL,
  description TEXT,
  "iconURL" TEXT,
  criteria JSONB
);

-- 7b. User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id),
  "badgeId" UUID REFERENCES badges(id),
  "awardedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Posts Table (Community)
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

-- 8b. Community Events Table
CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  offerings TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8c. Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "eventId" UUID REFERENCES community_events(id),
  "userId" UUID REFERENCES users(id),
  "joinedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Fraud Logs Table (Admin)
CREATE TABLE IF NOT EXISTS fraud_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "collectorId" UUID REFERENCES collectors(id),
  reason TEXT,
  severity TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. RPC for safely incrementing post likes
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET likes = likes + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Add Sustainability Score to Users Table (if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sustainabilityScore') THEN 
    ALTER TABLE users ADD COLUMN "sustainabilityScore" DECIMAL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isApproved') THEN 
    ALTER TABLE users ADD COLUMN "isApproved" BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isBanned') THEN 
    ALTER TABLE users ADD COLUMN "isBanned" BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collectors' AND column_name='isApproved') THEN 
    ALTER TABLE collectors ADD COLUMN "isApproved" BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collectors' AND column_name='isBanned') THEN 
    ALTER TABLE collectors ADD COLUMN "isBanned" BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 12. Enable RLS on all new tables
ALTER TABLE recycling_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;

-- 13. Setup RLS Policies (Idempotent)
DROP POLICY IF EXISTS "Allow anon to insert recycling_centers" ON recycling_centers;
CREATE POLICY "Allow anon to insert recycling_centers" ON recycling_centers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select recycling_centers" ON recycling_centers;
CREATE POLICY "Allow anon to select recycling_centers" ON recycling_centers FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update recycling_centers" ON recycling_centers;
CREATE POLICY "Allow anon to update recycling_centers" ON recycling_centers FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert businesses" ON businesses;
CREATE POLICY "Allow anon to insert businesses" ON businesses FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select businesses" ON businesses;
CREATE POLICY "Allow anon to select businesses" ON businesses FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update businesses" ON businesses;
CREATE POLICY "Allow anon to update businesses" ON businesses FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert carbon_credits" ON carbon_credits;
CREATE POLICY "Allow anon to insert carbon_credits" ON carbon_credits FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select carbon_credits" ON carbon_credits;
CREATE POLICY "Allow anon to select carbon_credits" ON carbon_credits FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update carbon_credits" ON carbon_credits;
CREATE POLICY "Allow anon to update carbon_credits" ON carbon_credits FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert certificates" ON certificates;
CREATE POLICY "Allow anon to insert certificates" ON certificates FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select certificates" ON certificates;
CREATE POLICY "Allow anon to select certificates" ON certificates FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update certificates" ON certificates;
CREATE POLICY "Allow anon to update certificates" ON certificates FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert sustainability_scores" ON sustainability_scores;
CREATE POLICY "Allow anon to insert sustainability_scores" ON sustainability_scores FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select sustainability_scores" ON sustainability_scores;
CREATE POLICY "Allow anon to select sustainability_scores" ON sustainability_scores FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update sustainability_scores" ON sustainability_scores;
CREATE POLICY "Allow anon to update sustainability_scores" ON sustainability_scores FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert issues" ON issues;
CREATE POLICY "Allow anon to insert issues" ON issues FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select issues" ON issues;
CREATE POLICY "Allow anon to select issues" ON issues FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update issues" ON issues;
CREATE POLICY "Allow anon to update issues" ON issues FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to select badges" ON badges;
CREATE POLICY "Allow anon to select badges" ON badges FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to insert user_badges" ON user_badges;
CREATE POLICY "Allow anon to insert user_badges" ON user_badges FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select user_badges" ON user_badges;
CREATE POLICY "Allow anon to select user_badges" ON user_badges FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to insert posts" ON posts;
CREATE POLICY "Allow anon to insert posts" ON posts FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select posts" ON posts;
CREATE POLICY "Allow anon to select posts" ON posts FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update posts" ON posts;
CREATE POLICY "Allow anon to update posts" ON posts FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert community_events" ON community_events;
CREATE POLICY "Allow anon to insert community_events" ON community_events FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select community_events" ON community_events;
CREATE POLICY "Allow anon to select community_events" ON community_events FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to insert event_participants" ON event_participants;
CREATE POLICY "Allow anon to insert event_participants" ON event_participants FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select event_participants" ON event_participants;
CREATE POLICY "Allow anon to select event_participants" ON event_participants FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to insert fraud_logs" ON fraud_logs;
CREATE POLICY "Allow anon to insert fraud_logs" ON fraud_logs FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to select fraud_logs" ON fraud_logs;
CREATE POLICY "Allow anon to select fraud_logs" ON fraud_logs FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to update fraud_logs" ON fraud_logs;
CREATE POLICY "Allow anon to update fraud_logs" ON fraud_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
