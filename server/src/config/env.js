require('dotenv').config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLIENT_APP_URL',
  'OCR_SERVICE_URL',
  'OCR_CONFIDENCE_REVIEW_THRESHOLD',
];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[Config Warning]: Missing environment variable: ${key}. Using default fallback if applicable.`);
  }
}

module.exports = {
  port: process.env.PORT || 4000,
  ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:8000',
  supabaseUrl: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
  clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:5173', // used to build invite links + CORS origin
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@maternalhealth.org',
  },
  inviteTokenTtlHours: Number(process.env.INVITE_TOKEN_TTL_HOURS || 72),
  ocrMetricReviewThreshold: Number(process.env.OCR_CONFIDENCE_REVIEW_THRESHOLD || 0.75),
};
