import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from './src/models/Admin';
import { Collector } from './src/models/Collector';
import { RecyclingCenter } from './src/models/RecyclingCenter';
import { User } from './src/models/User';
import { Pickup } from './src/models/Pickup';
import { Post } from './src/models/Post';
import { FraudLog } from './src/models/FraudLog';

await jest.unstable_mockModule('./src/controllers/ChatController', () => ({
  chatHandler: async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' });
    }
    return res.json({ reply: 'Mock chatbot response', reasoning_details: {} });
  }
}));

const appImport = await import('./app');
const app = appImport.default;
const initializeApp = appImport.initializeApp;

const TEST_PASSWORD = 'Test@123456';
const INVALID_ID = '000000000000000000000000';

let collectorToken = '';
let collectorId = '';
let userToken = '';
let userId = '';
let adminToken = '';
let adminId = '';
let recyclingCenterId = '';
let positivePickupId = '';
let missingProofPickupId = '';
let fraudPickupId = '';
let createdPostId = '';

describe('Collector and Community System (ID: 23101109)', () => {
  beforeAll(async () => {
    await initializeApp();

    const now = Date.now();
    const collectorEmail = `collector-${now}@greenloop.test`;
    const userEmail = `user-${now}@greenloop.test`;
    const centerEmail = `center-${now}@greenloop.test`;
    const adminEmail = `admin-${now}@greenloop.test`;

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Collector Tester',
        email: collectorEmail,
        password: TEST_PASSWORD,
        phone: '01700000000',
        role: 'collector'
      });

    const collectorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: collectorEmail, password: TEST_PASSWORD, role: 'collector' });

    collectorToken = collectorLogin.body.token;
    collectorId = collectorLogin.body.user.id;

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Tester',
        email: userEmail,
        password: TEST_PASSWORD,
        phone: '01800000000',
        role: 'user'
      });

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: TEST_PASSWORD, role: 'user' });

    userToken = userLogin.body.token;
    userId = userLogin.body.user.id;

    const hashedAdminPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminDoc = await Admin.create({
      name: 'Admin Tester',
      email: adminEmail,
      password: hashedAdminPassword,
      phone: '01900000000',
      role: 'admin'
    });

    adminId = adminDoc._id.toString();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD, role: 'admin' });

    adminToken = adminLogin.body.token;

    await request(app)
      .post('/api/auth/register')
      .send({
        centerName: 'Test Center',
        email: centerEmail,
        password: TEST_PASSWORD,
        phone: '01600000000',
        role: 'recycling_center',
        licenseNumber: 'RC-1234',
        address: '123 Test Lane'
      });

    const centerDoc = await RecyclingCenter.findOne({ email: centerEmail }).lean();
    recyclingCenterId = centerDoc?._id.toString() || '';

    const pickupBase = {
      userId,
      status: 'accepted_by_center',
      wasteType: 'plastic',
      deliveryCharge: 60
    };

    const positivePickup = await Pickup.create({ ...pickupBase, estimatedWeight: 25 });
    positivePickupId = positivePickup._id.toString();

    const missingProofPickup = await Pickup.create({ ...pickupBase, estimatedWeight: 10 });
    missingProofPickupId = missingProofPickup._id.toString();

    const fraudPickup = await Pickup.create({ ...pickupBase, estimatedWeight: 20 });
    fraudPickupId = fraudPickup._id.toString();
  });

  afterAll(async () => {
    await Promise.all([
      User.findByIdAndDelete(userId),
      Collector.findByIdAndDelete(collectorId),
      Admin.findByIdAndDelete(adminId),
      RecyclingCenter.findByIdAndDelete(recyclingCenterId),
      Pickup.deleteMany({ _id: { $in: [positivePickupId, missingProofPickupId, fraudPickupId] } }),
      Post.findByIdAndDelete(createdPostId),
      FraudLog.deleteMany({ collectorId })
    ]);
    await mongoose.connection.close();
  });

  describe('Collector Module', () => {
    it('should assign pickup and complete it with proof image', async () => {
      const assignResponse = await request(app)
        .post(`/api/collectors/pickup/assign/${positivePickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send();

      expect(assignResponse.statusCode).toEqual(200);
      expect(assignResponse.body).toHaveProperty('_id', positivePickupId);
      expect(assignResponse.body).toHaveProperty('status', 'accepted_by_collector');

      const completeResponse = await request(app)
        .post(`/api/collectors/pickup/update-status/${positivePickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          status: 'completed',
          actualWeight: 25,
          completionPhoto: 'https://example.com/proof.jpg'
        });

      expect(completeResponse.statusCode).toEqual(200);
      expect(completeResponse.body).toHaveProperty('message', 'Pickup completed successfully');
      expect(completeResponse.body.pickup).toHaveProperty('completionPhoto', 'https://example.com/proof.jpg');
      expect(completeResponse.body.pickup).toHaveProperty('status', 'completed');
    });

    it('should return 400 when completing a pickup without a proof image', async () => {
      const assignResponse = await request(app)
        .post(`/api/collectors/pickup/assign/${missingProofPickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send();

      expect(assignResponse.statusCode).toEqual(200);

      const completeResponse = await request(app)
        .post(`/api/collectors/pickup/update-status/${missingProofPickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'completed', actualWeight: 12 });

      expect(completeResponse.statusCode).toEqual(400);
      expect(completeResponse.body).toHaveProperty('message', 'Completion photo is required to complete a pickup');
    });

    it('should return 404 for invalid pickup ID', async () => {
      const res = await request(app)
        .post(`/api/collectors/pickup/update-status/${INVALID_ID}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'completed', actualWeight: 10, completionPhoto: 'https://example.com/proof.jpg' });

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Pickup not found');
    });

    it('should return 403 when a non-collector tries to use a collector endpoint', async () => {
      const res = await request(app)
        .post(`/api/collectors/pickup/update-status/${positivePickupId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'completed', actualWeight: 25, completionPhoto: 'https://example.com/proof.jpg' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('Fraud Detection', () => {
    it('should flag an unrealistic weight entry and create a fraud log', async () => {
      const assignResponse = await request(app)
        .post(`/api/collectors/pickup/assign/${fraudPickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send();

      expect(assignResponse.statusCode).toEqual(200);

      const completeResponse = await request(app)
        .post(`/api/collectors/pickup/update-status/${fraudPickupId}`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          status: 'completed',
          actualWeight: 5000,
          completionPhoto: 'https://example.com/fraud-proof.jpg'
        });

      expect(completeResponse.statusCode).toEqual(200);

      const fraudResponse = await request(app)
        .get('/api/admin/fraud-detection')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(fraudResponse.statusCode).toEqual(200);
      expect(Array.isArray(fraudResponse.body)).toBe(true);
      const fraudLog = fraudResponse.body.find((log) =>
        (log.pickupId && log.pickupId._id === fraudPickupId) || log.pickupId === fraudPickupId
      );
      expect(fraudLog).toBeDefined();
      expect(fraudLog).toHaveProperty('reason');
      expect(fraudLog).toHaveProperty('severity');
      expect(fraudLog.resolved).toEqual(false);
    });
  });

  describe('Community Posts', () => {
    it('should create a public community post', async () => {
      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'GreenLoop Community Update',
          content: 'This is a community post for testing.',
          images: ['https://example.com/post-image.jpg']
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title', 'GreenLoop Community Update');
      createdPostId = res.body._id;
    });

    it('should retrieve community posts', async () => {
      const res = await request(app)
        .get('/api/community/posts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((post) => post.id === createdPostId)).toBe(true);
    });

    it('should like a community post', async () => {
      const res = await request(app)
        .post(`/api/community/posts/like/${createdPostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('likes');
      expect(res.body.likes).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 when creating a post with missing title', async () => {
      const res = await request(app)
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '', content: 'Missing title should fail.' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 when liking an invalid post ID', async () => {
      const res = await request(app)
        .post(`/api/community/posts/like/${INVALID_ID}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Post not found');
    });
  });

  describe('AI Chatbot', () => {
    it('should return a chatbot reply for a valid prompt', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ messages: [{ role: 'user', content: 'How can I reduce plastic waste?' }] });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('reply');
      expect(typeof res.body.reply).toBe('string');
    });

    it('should return 400 for an invalid chat payload', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ messages: 'not-an-array' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when no auth token is provided to the chatbot', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Admin Role Management', () => {
    it('should approve a recycling center as admin', async () => {
      const res = await request(app)
        .post(`/api/admin/recycling-centers/${recyclingCenterId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verified: true });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.center).toHaveProperty('isApproved', true);
    });

    it('should return 403 when a non-admin tries to approve a recycling center', async () => {
      const res = await request(app)
        .post(`/api/admin/recycling-centers/${recyclingCenterId}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ verified: true });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 400 for an invalid admin role update request', async () => {
      const res = await request(app)
        .post(`/api/admin/ban/invalid_role/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ banned: true });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Unknown role');
    });
  });
});
