const { z } = require('zod');
const { responseType } = require('./questionnaire.validators');

const createAppointmentSchema = z.object({
  patientEmail: z.string().email(),
  patientFullName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  questionnaireTemplateIds: z.array(z.string().uuid()).optional(),
  newQuestions: z.array(z.object({
    text: z.string().trim().min(1).max(500),
    responseType: responseType.default('yes_no'),
    saveToList: z.boolean(),
  })).optional(),
});

const updateAppointmentStatusSchema = z.object({
  status: z.enum(['invited', 'active', 'checked_in', 'completed', 'cancelled']),
});

module.exports = { createAppointmentSchema, updateAppointmentStatusSchema };
