const { z } = require('zod');

const acceptInviteSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
  role: z.enum(['patient', 'clinician', 'receptionist']).default('patient'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = { acceptInviteSchema, signupSchema, loginSchema };
