const { z } = require('zod');

// Shape of one metric inside the OCR pipeline's JSON payload.
const ocrMetricSchema = z.object({
  key: z.string().min(1), // raw key, e.g. "HGB"
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Full payload the server expects at POST /lab-reports.
const ocrPayloadSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  storagePath: z.string().min(1),
  reportDate: z.string().optional(), // ISO date string
  metrics: z.array(ocrMetricSchema).default([]),
  ocrStatus: z.enum(['success', 'partial', 'failed']).default('success'),
});

const shareReportSchema = z.object({
  appointmentId: z.string().uuid(),
});

const reviewMetricSchema = z.object({
  standardKey: z.string().min(1).optional(),
  reviewedValue: z.number().optional(),
});

module.exports = { ocrPayloadSchema, reviewMetricSchema, shareReportSchema };
