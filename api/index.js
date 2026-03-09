import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load env vars
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB Connected');
    } catch (error) {
      console.error('MongoDB Connection Error:', error.message);
    }
  }
};

// Import routes
import authRoutes from '../server/routes/auth.js';
import userRoutes from '../server/routes/users.js';
import pickupRoutes from '../server/routes/pickups.js';
import collectorRoutes from '../server/routes/collectors.js';
import issueRoutes from '../server/routes/issues.js';
import badgeRoutes from '../server/routes/badges.js';
import eventRoutes from '../server/routes/events.js';
import postRoutes from '../server/routes/posts.js';
import recyclingCenterRoutes from '../server/routes/recycling-centers.js';
import fraudLogRoutes from '../server/routes/fraud-logs.js';
import adminRoutes from '../server/routes/admin.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/collectors', collectorRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/recycling-centers', recyclingCenterRoutes);
app.use('/api/fraud-logs', fraudLogRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GreenLoop API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export for Vercel
export default app;
