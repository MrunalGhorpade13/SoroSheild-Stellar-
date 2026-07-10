import request from 'supertest';
import app from './server';
import fs from 'fs';
import path from 'path';

// Mock fs readFileSync for sponsored.json to avoid filesystem dependence
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    readFileSync: jest.fn().mockImplementation((filePath: string, encoding: any) => {
      if (filePath.endsWith('sponsored.json')) {
        return JSON.stringify(['G...TESTADDRESS']);
      }
      return originalFs.readFileSync(filePath, encoding);
    }),
  };
});

describe('SoroShield Express API Server', () => {
  describe('GET /api/status', () => {
    it('should return 200 OK and online status', async () => {
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'online');
      expect(response.body).toHaveProperty('network');
      expect(response.body).toHaveProperty('horizon');
      expect(response.body).toHaveProperty('sponsoredCount');
    });
  });

  describe('POST /api/scan', () => {
    it('should return 400 Bad Request when code parameter is missing', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Code is required as a string.');
    });

    it('should return 400 Bad Request when code is not a string', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ code: 12345 });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Code is required as a string.');
    });
  });
});

