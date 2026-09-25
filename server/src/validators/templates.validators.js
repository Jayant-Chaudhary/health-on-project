const { z } = require('zod');

const TEMPLATE_KINDS = ['consultation', 'action'];

const label = z.string().trim().min(1).max(300);

const createTemplateSchema = z.object({
  kind: z.enum(TEMPLATE_KINDS),
  label,
});

const updateTemplateSchema = z
  .object({
    label: label.optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

module.exports = { TEMPLATE_KINDS, createTemplateSchema, updateTemplateSchema };
