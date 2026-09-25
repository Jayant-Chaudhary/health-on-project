const { z } = require('zod');

/** yes_no: answered Yes or No. text: answered in the patient's own words. */
const RESPONSE_TYPES = ['yes_no', 'text'];
const responseType = z.enum(RESPONSE_TYPES);

/**
 * One answer: a yes/no (`answer`, with optional `detail` after a Yes) or a
 * written one (`text`). Which of the two is checked against the question's
 * type in the controller, since only the database knows the type.
 */
const responseSchema = z
  .object({
    templateId: z.string().uuid(),
    answer: z.boolean().optional(),
    detail: z.string().trim().max(2000).optional(),
    text: z.string().trim().min(1).max(4000).optional(),
  })
  .refine((r) => (r.answer !== undefined) !== (r.text !== undefined), {
    message: 'Give either a yes/no answer or a written one',
  });

const submitResponsesSchema = z.object({
  appointmentId: z.string().uuid(),
  responses: z.array(responseSchema).min(1),
});

const questionText = z.string().trim().min(1).max(500);

const createTemplateSchema = z.object({
  questionText,
  responseType: responseType.default('yes_no'),
  isRedFlagTrigger: z.boolean().optional(),
});

const updateTemplateSchema = z
  .object({
    questionText: questionText.optional(),
    isRedFlagTrigger: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

module.exports = {
  RESPONSE_TYPES,
  responseType,
  submitResponsesSchema,
  createTemplateSchema,
  updateTemplateSchema,
};
