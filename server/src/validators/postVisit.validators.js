const { z } = require('zod');

const saveNotesSchema = z.object({
  notesText: z.string().min(1),
});

const createPrescriptionSchema = z.object({
  storagePath: z.string().min(1),
  typedInstructions: z.string().optional(),
});

const addActionItemSchema = z.object({
  label: z.string().min(1),
});

const toggleActionItemSchema = z.object({
  isCompleted: z.boolean(),
});

module.exports = { saveNotesSchema, createPrescriptionSchema, addActionItemSchema, toggleActionItemSchema };
