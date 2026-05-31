import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
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
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'postgres', timestamp: new Date().toISOString() }));

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

export async function initializeApp() {
  await connectDB();
  // TODO: Implement Drizzle seeding logic here or via a separate script
}

export default app;
