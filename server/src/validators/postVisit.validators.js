const { z } = require('zod');

// Empty is allowed: clearing the notes box has to save too.
const saveNotesSchema = z.object({
  notesText: z.string().max(20_000),
});

const createPrescriptionSchema = z.object({
  storagePath: z.string().min(1),
  typedInstructions: z.string().optional(),
});

const addActionItemSchema = z.object({
  label: z.string().trim().min(1).max(300),
});

const addConsultationItemSchema = z.object({
  label: z.string().trim().min(1).max(300),
});

const toggleActionItemSchema = z.object({
  isCompleted: z.boolean(),
});

module.exports = {
  saveNotesSchema,
  createPrescriptionSchema,
  addActionItemSchema,
  toggleActionItemSchema,
  addConsultationItemSchema,
};
