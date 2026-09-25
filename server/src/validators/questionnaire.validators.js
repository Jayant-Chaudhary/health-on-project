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

const questionText = z.string().trim().min(1).max(500);

const createTemplateSchema = z.object({
  questionText,
  isRedFlagTrigger: z.boolean().optional(),
});

const updateTemplateSchema = z
  .object({
    questionText: questionText.optional(),
    isRedFlagTrigger: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

module.exports = { submitResponsesSchema, createTemplateSchema, updateTemplateSchema };
