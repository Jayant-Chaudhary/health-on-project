const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    admin: {
      listUsers: jest.fn(),
      createUser: jest.fn(),
      updateUserById: jest.fn(),
    },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    const validSignupPayload = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'patient',
      phone: '1234567890',
    };

    it('should register a new patient successfully', async () => {
      const mockCreatedUser = { id: 'user-123', email: 'test@example.com' };
      
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: mockCreatedUser },
        error: null,
      });

      supabaseAdmin.from.mockImplementation((table) => {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupPayload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Signup successful');
      expect(response.body.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        fullName: 'Test User',
      });
      
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: validSignupPayload.email,
        password: validSignupPayload.password,
        email_confirm: true,
        user_metadata: { full_name: validSignupPayload.fullName, role: validSignupPayload.role },
      });
    });

    it('should return 400 if user creation fails', async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already exists');
    });

    it('should return 400 for invalid payload', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'not-an-email' }); // Missing required fields

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    const validLoginPayload = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user and return session', async () => {
      const mockSession = { access_token: 'valid-token' };
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = { id: 'user-123', role: 'patient', full_name: 'Test User' };

      supabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.session).toEqual(mockSession);
      expect(response.body.profile).toEqual(mockProfile);
    });

    it('should return 401 on invalid credentials', async () => {
      supabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginPayload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 if token is missing', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing or invalid Authorization header');
    });

    it('should return user info if token is valid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = { role: 'patient', full_name: 'Test User' };

      supabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        fullName: 'Test User',
      });
    });
  });
});
