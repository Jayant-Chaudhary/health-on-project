const { z } = require('zod');

const createAppointmentSchema = z.object({
  patientEmail: z.string().email(),
  patientFullName: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

const updateAppointmentStatusSchema = z.object({
  status: z.enum(['invited', 'active', 'checked_in', 'completed', 'cancelled']),
});

module.exports = { createAppointmentSchema, updateAppointmentStatusSchema };
