const express = require('express');
const multer = require('multer');
const env = require('../config/env');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const {
  saveNotesSchema,
  createPrescriptionSchema,
  addActionItemSchema,
  toggleActionItemSchema,
  addConsultationItemSchema,
} = require('../validators/postVisit.validators');
const {
  saveNotes,
  addPrescription,
  uploadPrescription,
  addActionItem,
  getPostVisitSummary,
  toggleActionItem,
  deleteActionItem,
  addConsultationItem,
  deleteConsultationItem,
} = require('../controllers/postVisit.controller');

const router = express.Router();

/** Prescriptions are a photo of the written script or a PDF from the clinic's system. */
const prescriptionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}. Upload a PDF or a photo.`));
  },
});

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
  '/:appointmentId/prescriptions/upload',
  roleGuard('clinician'),
  prescriptionUpload.single('file'),
  uploadPrescription
);
router.post(
  '/:appointmentId/action-items',
  roleGuard('clinician'),
  validateBody(addActionItemSchema),
  addActionItem
);
router.patch('/action-items/:itemId', validateBody(toggleActionItemSchema), toggleActionItem);
router.delete('/action-items/:itemId', roleGuard('clinician'), deleteActionItem);
router.post(
  '/:appointmentId/consultation-items',
  roleGuard('clinician'),
  validateBody(addConsultationItemSchema),
  addConsultationItem
);
router.delete('/consultation-items/:itemId', roleGuard('clinician'), deleteConsultationItem);

module.exports = router;
