const { z } = require('zod');

const submitResponsesSchema = z.object({
  appointmentId: z.string().uuid(),
  responses: z
    .array(
      z.object({
        templateId: z.string().uuid(),
        answer: z.boolean(),
        detail: z.string().trim().max(2000).optional(),
      })
    )
    .min(1),
});

const createTemplateSchema = z.object({
  questionText: z.string().trim().min(1).max(500),
});

module.exports = { submitResponsesSchema, createTemplateSchema };
