import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './src/db';
import authRoutes from './src/routes/auth';
import userRoutes from './src/routes/users';
import pickupRoutes from './src/routes/pickups';
import recyclingCenterRoutes from './src/routes/recyclingCenters';
import collectorRoutes from './src/routes/collectors';
import adminRoutes from './src/routes/admin';
import communityRoutes from './src/routes/community';
import businessRoutes from './src/routes/businesses';
import badgeRoutes from './src/routes/badges';
import chatRoutes from './src/routes/chat';
import { Badge } from './src/models/Badge';
import { RecyclingCenter } from './src/models/RecyclingCenter';
import { CarbonCredit } from './src/models/CarbonCredit';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

async function seedData() {
  const allBadgeDefs = [
    { badgeName: 'Eco Starter', description: 'Complete your first pickup', iconURL: 'https://cdn-icons-png.flaticon.com/512/2910/2910756.png', targetRole: 'user', criteria: { type: 'pickupsCompleted', threshold: 1 } },
    { badgeName: 'Carbon Warrior', description: 'Reduce 10kg of CO2', iconURL: 'https://cdn-icons-png.flaticon.com/512/1598/1598196.png', targetRole: 'user', criteria: { type: 'co2Reduced', threshold: 10 } },
    { badgeName: 'Point Master', description: 'Earn 1000 Eco-Points', iconURL: 'https://cdn-icons-png.flaticon.com/512/2166/2166951.png', targetRole: 'user', criteria: { type: 'ecoPoints', threshold: 1000 } },
    { badgeName: 'Credit Collector', description: 'Earn 25 Carbon Credits', iconURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png', targetRole: 'user', criteria: { type: 'carbonCredits', threshold: 25 } },
    { badgeName: 'Eco Champion', description: 'Complete 10 pickups', iconURL: 'https://cdn-icons-png.flaticon.com/512/3176/3176372.png', targetRole: 'user', criteria: { type: 'pickupsCompleted', threshold: 10 } },
    { badgeName: 'Quick Start', description: 'Complete your first delivery', iconURL: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png', targetRole: 'collector', criteria: { type: 'pickupsCompleted', threshold: 1 } },
    { badgeName: 'Delivery Pro', description: 'Complete 10 deliveries', iconURL: 'https://cdn-icons-png.flaticon.com/512/3456/3456426.png', targetRole: 'collector', criteria: { type: 'pickupsCompleted', threshold: 10 } },
    { badgeName: 'Weekly Star', description: 'Complete 5 deliveries in a week', iconURL: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png', targetRole: 'collector', criteria: { type: 'weeklyPickups', threshold: 5 } },
    { badgeName: 'High Earner', description: 'Earn ৳500 in total delivery charges', iconURL: 'https://cdn-icons-png.flaticon.com/512/584/584052.png', targetRole: 'collector', criteria: { type: 'totalEarnings', threshold: 500 } },
    { badgeName: 'Waste Processor', description: 'Process 10 completed pickups from collectors', iconURL: 'https://cdn-icons-png.flaticon.com/512/3456/3456426.png', targetRole: 'recycling_center', criteria: { type: 'pickupsProcessed', threshold: 10 } },
    { badgeName: 'Volume Champion', description: 'Collect 100kg of waste through collectors', iconURL: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png', targetRole: 'recycling_center', criteria: { type: 'totalWasteKg', threshold: 100 } },
    { badgeName: 'Diversity Expert', description: 'Collect 3+ different waste types from collectors', iconURL: 'https://cdn-icons-png.flaticon.com/512/1598/1598196.png', targetRole: 'recycling_center', criteria: { type: 'wasteTypeDiversity', threshold: 3 } },
    { badgeName: 'Green Certified', description: 'Certified green recycling center', iconURL: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png', targetRole: 'recycling_center', criteria: null },
    { badgeName: 'Eco Partner', description: 'Eco-friendly business partner', iconURL: 'https://cdn-icons-png.flaticon.com/512/2910/2910756.png', targetRole: 'business', criteria: null },
    { badgeName: 'Sustainability Leader', description: 'Leading in sustainable practices', iconURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135783.png', targetRole: 'business', criteria: null },
    { badgeName: 'Carbon Neutral', description: 'Committed to carbon-neutral operations', iconURL: 'https://cdn-icons-png.flaticon.com/512/1598/1598196.png', targetRole: 'business', criteria: null }
  ];

  await Badge.bulkWrite(allBadgeDefs.map((def) => ({ updateOne: { filter: { badgeName: def.badgeName }, update: { $setOnInsert: def }, upsert: true } })));

  const centerCount = await RecyclingCenter.countDocuments();
  if (centerCount === 0) {
    const hashedPassword = await bcrypt.hash('center123', 10);
    await RecyclingCenter.insertMany([
      { centerName: 'GreenWay Recycling', email: 'center1@greenloop.com', password: hashedPassword, phone: '1234567890', licenseNumber: 'RC-001', address: '123 Eco St, Green City', role: 'recycling_center' },
      { centerName: 'PureCycle Hub', email: 'center2@greenloop.com', password: hashedPassword, phone: '0987654321', licenseNumber: 'RC-002', address: '456 Clean Ave, Blue Town', role: 'recycling_center' }
    ]);
  }

  const creditCount = await CarbonCredit.countDocuments();
  if (creditCount === 0) {
    await CarbonCredit.insertMany([
      { amount: 10, price: 500, status: 'available', source: 'GreenWay Recycling' },
      { amount: 25, price: 1200, status: 'available', source: 'PureCycle Hub' },
      { amount: 50, price: 2300, status: 'available', source: 'GreenWay Recycling' }
    ]);
  }
}

async function startServer() {
  const app = express();

  await connectDB();
  await seedData();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'mongodb', timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/pickups', pickupRoutes);
  app.use('/api/recycling-centers', recyclingCenterRoutes);
  app.use('/api/collectors', collectorRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/businesses', businessRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/chat', chatRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
