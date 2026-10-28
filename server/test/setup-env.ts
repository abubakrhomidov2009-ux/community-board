import { getTestDatabaseUrl } from './test-database';

// Runs in every test file before the app is created.
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.NODE_ENV = 'test';
// Rate limits are off by default so tests can log in many times; the rate-limit test switches them on.
process.env.THROTTLE_DISABLED = 'true';
// Tests must never send a real email or upload a real photo.
process.env.BREVO_API_KEY = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
// The super admin comes from server/.env in real life; tests create their own users.
process.env.SUPER_ADMIN_EMAIL = '';
process.env.SUPER_ADMIN_PASSWORD = '';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_EXPIRES_IN = '30d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SITE_URL = 'http://localhost:3000';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'e2e-test-secret-at-least-16-chars';
