const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const {
  saveNotesSchema,
  createPrescriptionSchema,
  addActionItemSchema,
} = require('../validators/postVisit.validators');
const {
  saveNotes,
  addPrescription,
  addActionItem,
  getPostVisitSummary,
} = require('../controllers/postVisit.controller');

const router = express.Router();

router.use(authGuard);

router.get('/:appointmentId', getPostVisitSummary);
router.put('/:appointmentId/notes', roleGuard('clinician'), validateBody(saveNotesSchema), saveNotes);
router.post(
  '/:appointmentId/prescriptions',
  roleGuard('clinician'),
  validateBody(createPrescriptionSchema),
  addPrescription
);
router.post(
  '/:appointmentId/action-items',
  roleGuard('clinician'),
  validateBody(addActionItemSchema),
  addActionItem
);

module.exports = router;
