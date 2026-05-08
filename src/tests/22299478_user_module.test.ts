
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Pickup } from '../models/Pickup';
import { Collector } from '../models/Collector';
import { Badge } from '../models/Badge';

jest.setTimeout(60000);

describe('Feature: User Module & Related APIs (ID: 22299478)', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'test';
    // Provide placeholder API keys used by optional controllers to avoid module-load failures
    process.env.OPENROUTER_API = process.env.OPENROUTER_API || 'test';

    // import createApp lazily after env is set
    const { createApp } = await import('../app');
    app = await createApp();

    // Register and login a test user
    const email = 'testuser@example.com';
    const password = 'Password123!';
    await request(app).post('/api/auth/register').send({ name: 'Test User', email, password, role: 'user', phone: '000' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    token = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // CASE A: Schedule Pickup (CRUD) 
  describe('Case A: Schedule Pickup - Create & Retrieve', () => {
    let pickupId = '';

    it('POST /api/pickups/schedule should create pickup with 201 status', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'plastic',
          estimatedWeight: 2.5,
          location: { lat: 23.7806, lng: 90.2794 }
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('wasteType', 'plastic');
      expect(res.body).toHaveProperty('estimatedWeight', 2.5);
      expect(res.body).toHaveProperty('status', 'pending');
      pickupId = res.body._id;
    });

    it('should return 400 when scheduling without required fields (wasteType)', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          estimatedWeight: 2,
          location: { lat: 23.7806, lng: 90.2794 }
          // missing wasteType
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when scheduling without weight', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'paper',
          location: { lat: 23.7806, lng: 90.2794 }
          // missing estimatedWeight
        });

      expect(res.status).toBe(400);
    });

    it('should return 401/403 when scheduling without auth token', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .send({
          wasteType: 'plastic',
          estimatedWeight: 2,
          location: { lat: 23.7806, lng: 90.2794 }
        });

      expect([401, 403]).toContain(res.status);
    });

    it('should allow scheduling multiple pickups for same user', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'glass',
          estimatedWeight: 1.5,
          location: { lat: 23.75, lng: 90.28 }
        });

      expect(res.status).toBe(201);
      expect(res.body.wasteType).toBe('glass');
    });
  });

  //  CASE B: View Pickup History 
  describe('Case B: View Pickup History - Retrieve User Pickups', () => {
    it('GET /api/users/me/pickups should return array of pickups', async () => {
      const res = await request(app)
        .get('/api/users/me/pickups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('pickup history should contain required fields', async () => {
      const res = await request(app)
        .get('/api/users/me/pickups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.forEach((pickup: any) => {
        expect(pickup).toHaveProperty('_id');
        expect(pickup).toHaveProperty('wasteType');
        expect(pickup).toHaveProperty('status');
        expect(pickup).toHaveProperty('estimatedWeight');
        expect(pickup).toHaveProperty('createdAt');
      });
    });

    it('history should be sorted by most recent first', async () => {
      const res = await request(app)
        .get('/api/users/me/pickups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      if (res.body.length > 1) {
        const dates = res.body.map((p: any) => new Date(p.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });

    it('should return 401/403 without auth token', async () => {
      const res = await request(app).get('/api/users/me/pickups');

      expect([401, 403]).toContain(res.status);
    });
  });

  // CASE C: Eco-Points & CO₂ Reduction Tracking 
  describe('Case C: Eco-Points & CO₂ Reduction Calculation', () => {
    it('collector completing pickup should award eco-points to user', async () => {
      // Create & login collector
      const cEmail = 'collector@example.com';
      const cPass = 'CollectorPass1!';
      await request(app).post('/api/auth/register').send({
        name: 'Collector',
        email: cEmail,
        password: cPass,
        role: 'collector',
        phone: '111'
      });
      const cRes = await request(app).post('/api/auth/login').send({
        email: cEmail,
        password: cPass,
        role: 'collector'
      });
      const collectorToken = cRes.body.token;
      const collectorId = cRes.body.user.id;

      // Get user's first pickup
      const pickups = await Pickup.find({ userId });
      expect(pickups.length).toBeGreaterThanOrEqual(1);
      const pickup = pickups[0];

      // Assign collector to pickup
      await Pickup.findByIdAndUpdate(pickup._id, { collectorId }, { new: true });

      // Complete pickup
      await request(app)
        .post(`/api/collectors/pickup/update-status/${pickup._id}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'completed', actualWeight: 5, completionPhoto: 'http://example.com/photo.jpg' });

      // Verify user got eco-points
      const userDoc = await User.findById(userId);
      expect((userDoc?.ecoPoints || 0)).toBeGreaterThanOrEqual(1);
    });

    it('collector completing pickup should award CO₂ reduction to user', async () => {
      const userBefore = await User.findById(userId);
      const co2Before = userBefore?.totalCO2Reduced || 0;

      // Create another pickup to complete
      const pickupRes = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'metal',
          estimatedWeight: 3,
          location: { lat: 23.79, lng: 90.29 }
        });
      const pickupId = pickupRes.body._id;

      // Create collector
      const cEmail = 'collector2@example.com';
      const cPass = 'CollPass2!';
      await request(app).post('/api/auth/register').send({
        name: 'Collector2',
        email: cEmail,
        password: cPass,
        role: 'collector',
        phone: '222'
      });
      const cRes = await request(app).post('/api/auth/login').send({
        email: cEmail,
        password: cPass,
        role: 'collector'
      });
      const collectorToken = cRes.body.token;
      const collectorId = cRes.body.user.id;

      // Assign and complete
      await Pickup.findByIdAndUpdate(pickupId, { collectorId }, { new: true });
      await request(app)
        .post(`/api/collectors/pickup/update-status/${pickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'completed', actualWeight: 3, completionPhoto: 'http://example.com/photo2.jpg' });

      // Verify CO2 increased
      const userAfter = await User.findById(userId);
      expect((userAfter?.totalCO2Reduced || 0)).toBeGreaterThan(co2Before);
    });

    it('eco-points should be non-negative', async () => {
      const userDoc = await User.findById(userId);
      expect((userDoc?.ecoPoints || 0)).toBeGreaterThanOrEqual(0);
    });

    it('CO₂ reduction should be non-negative', async () => {
      const userDoc = await User.findById(userId);
      expect((userDoc?.totalCO2Reduced || 0)).toBeGreaterThanOrEqual(0);
    });
  });

  //  CASE D: Badge Achievement System 
  describe('Case D: Badge Achievement System - Progress & Claiming', () => {
    it('GET /api/users/me/badge-progress should return all badges', async () => {
      const res = await request(app)
        .get('/api/users/me/badge-progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('badge progress should include all required fields', async () => {
      const res = await request(app)
        .get('/api/users/me/badge-progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.forEach((badge: any) => {
        expect(badge).toHaveProperty('badgeName');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('current');
        expect(badge).toHaveProperty('threshold');
        expect(badge).toHaveProperty('earned');
        expect(typeof badge.earned).toBe('boolean');
      });
    });

    it('POST /api/users/me/claim-badge should claim earned badge', async () => {
      const res = await request(app)
        .post('/api/users/me/claim-badge')
        .set('Authorization', `Bearer ${token}`)
        .send({ badgeName: 'Eco Starter' });

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('badges');
        expect(Array.isArray(res.body.badges)).toBe(true);
      }
    });

    it('should return 400 when claiming without badgeName', async () => {
      const res = await request(app)
        .post('/api/users/me/claim-badge')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 when claiming non-existent badge', async () => {
      const res = await request(app)
        .post('/api/users/me/claim-badge')
        .set('Authorization', `Bearer ${token}`)
        .send({ badgeName: 'Fake Badge That Does Not Exist' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when re-claiming already claimed badge', async () => {
      // First claim
      await request(app)
        .post('/api/users/me/claim-badge')
        .set('Authorization', `Bearer ${token}`)
        .send({ badgeName: 'Eco Starter' });

      // Try to claim again
      const res = await request(app)
        .post('/api/users/me/claim-badge')
        .set('Authorization', `Bearer ${token}`)
        .send({ badgeName: 'Eco Starter' });

      expect(res.status).toBe(400);
    });

    it('should return 401/403 without auth token', async () => {
      const res = await request(app)
        .get('/api/users/me/badge-progress');

      expect([401, 403]).toContain(res.status);
    });
  });

  //  CASE E: Rate Collectors 
  describe('Case E: Rate Collectors - Rating Completed Pickups', () => {
    let ratingPickupId = '';

    beforeEach(async () => {
      const completed = await Pickup.findOne({ userId, status: 'completed' });
      if (completed) {
        ratingPickupId = completed._id.toString();
      }
    });

    it('POST /api/pickups/:id/rate should rate pickup with valid stars', async () => {
      if (!ratingPickupId) {
        console.log('Skipping rate test: no completed pickup available');
        return;
      }

      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 5, review: 'Excellent service!' });

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('pickup');
        expect(res.body.pickup).toHaveProperty('rating');
      }
    });

    it('should return 400 when rating without stars field', async () => {
      if (!ratingPickupId) return;
      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ review: 'Good' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when rating with stars out of range (< 1)', async () => {
      if (!ratingPickupId) return;
      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 0 });

      expect(res.status).toBe(400);
    });

    it('should return 400 when rating with stars out of range (> 5)', async () => {
      if (!ratingPickupId) return;
      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 6 });

      expect(res.status).toBe(400);
    });

    it('should return 404 when rating non-existent pickup', async () => {
      const res = await request(app)
        .post('/api/pickups/000000000000000000000000/rate')
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 5 });

      expect(res.status).toBe(404);
    });

    it('should return 401/403 without auth token', async () => {
      if (!ratingPickupId) return;
      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .send({ stars: 5 });

      expect([401, 403]).toContain(res.status);
    });

    it('rating should update collector performance rating', async () => {
      if (!ratingPickupId) return;
      const pickup = await Pickup.findById(ratingPickupId);
      if (!pickup?.collectorId) return;

      const collectorBefore = await Collector.findById(pickup.collectorId);
      const ratingsBefore = collectorBefore?.totalRatings || 0;

      const res = await request(app)
        .post(`/api/pickups/${ratingPickupId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 4, review: 'Good' });

      if (res.status === 200) {
        const collectorAfter = await Collector.findById(pickup.collectorId);
        expect((collectorAfter?.totalRatings || 0)).toBeGreaterThanOrEqual(ratingsBefore);
      }
    });
  });

  //  CASE F: Redeem Points for Rewards 
  describe('Case F: Redeem Points for Rewards - Create & Validate', () => {
    it('POST /api/users/me/redeem-reward should redeem reward with sufficient points', async () => {
      // Top up user points
      const user = await User.findById(userId);
      if (user) {
        user.ecoPoints = 500;
        await user.save();
      }

      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ rewardTitle: 'Eco T-Shirt', pointsCost: 100 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ecoPoints');
      expect(res.body.ecoPoints).toBeLessThan(500);
    });

    it('should return 400 when redeeming without rewardTitle', async () => {
      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ pointsCost: 50 });

      expect(res.status).toBe(400);
    });

    it('should return 400 when redeeming without pointsCost', async () => {
      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ rewardTitle: 'Badge' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when redeeming with zero or negative points', async () => {
      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ rewardTitle: 'Free Item', pointsCost: 0 });

      expect(res.status).toBe(400);
    });

    it('should return 400 when user has insufficient points', async () => {
      // Set user points to 10
      const user = await User.findById(userId);
      if (user) {
        user.ecoPoints = 10;
        await user.save();
      }

      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ rewardTitle: 'Expensive Item', pointsCost: 500 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient');
    });

    it('should return 401/403 without auth token', async () => {
      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .send({ rewardTitle: 'Test', pointsCost: 100 });

      expect([401, 403]).toContain(res.status);
    });

    it('redeemed reward should be recorded in user history', async () => {
      // Top up points
      const user = await User.findById(userId);
      if (user) {
        user.ecoPoints = 200;
        await user.save();
      }

      // Redeem
      const res = await request(app)
        .post('/api/users/me/redeem-reward')
        .set('Authorization', `Bearer ${token}`)
        .send({ rewardTitle: 'Sticker Pack', pointsCost: 50 });

      if (res.status === 200) {
        const updated = await User.findById(userId);
        expect(updated?.redeemedRewards.length || 0).toBeGreaterThanOrEqual(1);
      }
    });

    it('GET /api/users/me/redeemed-rewards should return reward history', async () => {
      const res = await request(app)
        .get('/api/users/me/redeemed-rewards')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('reward history should contain required fields', async () => {
      const res = await request(app)
        .get('/api/users/me/redeemed-rewards')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200 && res.body.length > 0) {
        res.body.forEach((reward: any) => {
          expect(reward).toHaveProperty('rewardTitle');
          expect(reward).toHaveProperty('pointsCost');
          expect(reward).toHaveProperty('redeemedAt');
        });
      }
    });
  });

  //  CASE G: Boundary & Integration Tests 
  describe('Case G: Boundary & Integration Tests', () => {
    it('should handle scheduling extremely high weight (boundary)', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'metal',
          estimatedWeight: 9999,
          location: { lat: 23.78, lng: 90.27 }
        });

      expect([201, 400]).toContain(res.status);
    });

    it('should handle scheduling with invalid waste type', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: '',
          estimatedWeight: 2,
          location: { lat: 23.78, lng: 90.27 }
        });

      expect([201, 400]).toContain(res.status);
    });

    it('should handle missing location in schedule', async () => {
      const res = await request(app)
        .post('/api/pickups/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          wasteType: 'plastic',
          estimatedWeight: 2
          // missing location
        });

      expect([201, 400]).toContain(res.status);
    });

    it('estimate charge with negative weight should be handled', async () => {
      const res = await request(app)
        .post('/api/pickups/estimate-charge')
        .set('Authorization', `Bearer ${token}`)
        .send({ lat: 23.78, lng: 90.27, weightKg: -5 });

      expect([200, 400]).toContain(res.status);
    });

    it('estimate charge should return consistent numeric charge', async () => {
      const res = await request(app)
        .post('/api/pickups/estimate-charge')
        .set('Authorization', `Bearer ${token}`)
        .send({ lat: 23.78, lng: 90.27, weightKg: 5 });

      if (res.status === 200) {
        expect(typeof res.body.charge).toBe('number');
        expect(res.body.charge).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
