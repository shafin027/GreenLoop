import request from 'supertest';
import app, { initializeApp } from '../app';
import bcrypt from 'bcryptjs';
import { Admin } from './src/models/Admin';
import { User } from './src/models/User';
import { CommunityEvent } from './src/models/CommunityEvent';

let adminToken: string = '';
let userToken: string = '';
let adminId: string = '';
let userId: string = '';
let createdEventId: string = '';

const TEST_PASSWORD = 'Test@123456';
const unique = Date.now();
const adminEmail = `admin-events-${unique}@greenloop.com`;
const userEmail = `normal-user-events-${unique}@greenloop.com`;
const eventTitle = `GreenLoop Unit Test Event ${unique}`;
const updatedEventTitle = `Updated GreenLoop Unit Test Event ${unique}`;

describe('Feature: Admin Event Management CRUD (ID: 23101107)', () => {
  beforeAll(async () => {
    await initializeApp();

    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // Create admin directly to avoid depending on first-admin signup availability.
    const admin = await Admin.create({
      name: 'Event Admin Test',
      email: adminEmail,
      password: hashedPassword,
      phone: '01700000000',
      role: 'admin'
    });
    adminId = admin._id.toString();

    const user = await User.create({
      name: 'Normal User Test',
      email: userEmail,
      password: hashedPassword,
      phone: '01800000000',
      role: 'user'
    });
    userId = user._id.toString();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: TEST_PASSWORD,
        role: 'admin'
      });

    adminToken = adminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: TEST_PASSWORD,
        role: 'user'
      });

    userToken = userLogin.body.token;

    expect(adminToken).toBeDefined();
    expect(userToken).toBeDefined();
  });

  afterAll(async () => {
    if (createdEventId) {
      await CommunityEvent.findByIdAndDelete(createdEventId);
    }

    await CommunityEvent.deleteMany({
      title: { $regex: `GreenLoop Unit Test Event ${unique}|Updated GreenLoop Unit Test Event ${unique}` }
    });

    if (adminId) await Admin.findByIdAndDelete(adminId);
    if (userId) await User.findByIdAndDelete(userId);
  });

  // TEST 1: Create Event - Happy Path
  it('should allow an admin to create a community event', async () => {
    const res = await request(app)
      .post('/api/community/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: eventTitle,
        description: 'A unit-test event for GreenLoop recycling awareness.',
        date: '2026-06-22',
        startDate: '2026-06-22T09:00:00.000Z',
        endDate: '2026-06-22T16:00:00.000Z',
        location: 'Central Civic Park, Dhaka',
        offerings: ['Recycling Drop-Off', 'Eco Awareness Talk'],
        imageURL: 'data:image/png;base64,test-event-image'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('title', eventTitle);
    expect(res.body).toHaveProperty('location', 'Central Civic Park, Dhaka');
    expect(res.body).toHaveProperty('imageURL', 'data:image/png;base64,test-event-image');

    createdEventId = res.body._id;
  });

  // TEST 2: Read Events - Happy Path
  it('should list community events and include the created event', async () => {
    const res = await request(app).get('/api/community/events');

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);

    const createdEvent = res.body.find((event: any) => event._id === createdEventId);
    expect(createdEvent).toBeDefined();
    expect(createdEvent).toHaveProperty('title', eventTitle);
    expect(createdEvent).toHaveProperty('participantCount');
  });

  // TEST 3: Update Event - Happy Path
  it('should allow an admin to update an existing event', async () => {
    const res = await request(app)
      .put(`/api/community/admin/events/${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: updatedEventTitle,
        description: 'Updated event details from unit test.',
        date: '2026-06-23',
        location: 'Updated GreenLoop Venue, Dhaka',
        offerings: ['Updated Recycling Workshop'],
        imageURL: 'https://example.com/updated-event-image.png'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', createdEventId);
    expect(res.body).toHaveProperty('title', updatedEventTitle);
    expect(res.body).toHaveProperty('location', 'Updated GreenLoop Venue, Dhaka');
    expect(res.body).toHaveProperty('imageURL', 'https://example.com/updated-event-image.png');
  });

  // TEST 4: Verify Updated Event in List - Read After Update
  it('should return updated event data when events are listed again', async () => {
    const res = await request(app).get('/api/community/events');

    expect(res.statusCode).toEqual(200);
    const updatedEvent = res.body.find((event: any) => event._id === createdEventId);

    expect(updatedEvent).toBeDefined();
    expect(updatedEvent).toHaveProperty('title', updatedEventTitle);
    expect(updatedEvent).toHaveProperty('location', 'Updated GreenLoop Venue, Dhaka');
  });

  // TEST 5: Validation Error - Missing Required Title
  it('should return 400 when admin creates an event without a title', async () => {
    const res = await request(app)
      .post('/api/community/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'This event is missing title.',
        date: '2026-06-22',
        location: 'Dhaka'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message');
  });

  // TEST 6: Unauthorized Create - No Token
  it('should return 401 when creating event without auth token', async () => {
    const res = await request(app)
      .post('/api/community/events')
      .send({
        title: 'Unauthorized Event',
        description: 'This should not be created.',
        date: '2026-06-22',
        location: 'Dhaka'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message');
  });

  // TEST 7: Forbidden Create - Normal User Token
  it('should return 403 when normal user tries to create an admin event', async () => {
    const res = await request(app)
      .post('/api/community/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'User Created Event Attempt',
        description: 'Normal users should not create official events.',
        date: '2026-06-22',
        location: 'Dhaka'
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('message');
  });

  // TEST 8: Update Not Found
  it('should return 404 when admin updates a non-existent event', async () => {
    const res = await request(app)
      .put('/api/community/admin/events/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Non-existent Event Update'
      });

    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('message', 'Event not found');
  });

  // TEST 9: Forbidden Update - Normal User Token
  it('should return 403 when normal user tries to update an event', async () => {
    const res = await request(app)
      .put(`/api/community/admin/events/${createdEventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Illegal User Update'
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('message');
  });

  // TEST 10: Delete Event - Happy Path
  it('should allow an admin to delete an existing event', async () => {
    const res = await request(app)
      .delete(`/api/community/admin/events/${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Event deleted successfully');

    const deletedEvent = await CommunityEvent.findById(createdEventId);
    expect(deletedEvent).toBeNull();

    createdEventId = '';
  });

  // TEST 11: Delete Not Found
  it('should return 404 when deleting a non-existent event', async () => {
    const res = await request(app)
      .delete('/api/community/admin/events/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('message', 'Event not found');
  });

  // TEST 12: Forbidden Delete - Normal User Token
  it('should return 403 when normal user tries to delete an event', async () => {
    const event = await CommunityEvent.create({
      title: `Temporary Forbidden Delete Event ${unique}`,
      description: 'Temporary event for forbidden delete test.',
      date: new Date(),
      location: 'Dhaka'
    });

    const res = await request(app)
      .delete(`/api/community/admin/events/${event._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('message');

    await CommunityEvent.findByIdAndDelete(event._id);
  });
});
