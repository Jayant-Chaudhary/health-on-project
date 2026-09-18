const { z } = require('zod');

const logVitalSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  metricKey: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
});

module.exports = { logVitalSchema };
