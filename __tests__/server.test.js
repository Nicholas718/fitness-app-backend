const request = require('supertest');
const app = require('../server.js');
const pool = require('../server.js');

describe('POST /users', () => {
  it('should create a new user', async () => {
    const userData = {
      name: 'Sam Doe',
      email: 'W@example.com',
      dob: '1990-01-01',
      height: 180,
      firebase_uid: 'some_firebase_uid',
      dataSet: [],
    };

    const response = await request(app).post('/users').send(userData);

    expect(response.status).toBe(201);

    expect(response.body.message).toBe(
      'User and related data inserted successfully'
    );
  });
});

describe('GET /users', () => {
  it('should return all users when there are users in the database', async () => {
    const response = await request(app).get('/users').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
