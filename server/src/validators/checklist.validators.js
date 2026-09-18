const { z } = require('zod');

const toggleChecklistItemSchema = z.object({
  isCompleted: z.boolean(),
});

module.exports = { toggleChecklistItemSchema };
