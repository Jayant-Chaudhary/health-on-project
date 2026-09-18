const { z } = require('zod');

const submitResponsesSchema = z.object({
  appointmentId: z.string().uuid(),
  responses: z
    .array(
      z.object({
        templateId: z.string().uuid(),
        answer: z.boolean(),
      })
    )
    .min(1),
});

module.exports = { submitResponsesSchema };
