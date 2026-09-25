const express = require('express');
const multer = require('multer');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const env = require('../config/env');
const {
  ocrPayloadSchema,
  reviewMetricSchema,
  shareReportSchema,
} = require('../validators/labReports.validators');
const {
  ingestReport,
  uploadReport,
  listReportsForPatient,
  listSharedHistory,
  getMetricTrend,
  reviewMetric,
  listTriageQueue,
  shareReportWithAppointment,
  shareAllReports,
  unshareReportFromAppointment,
  deleteReport,
} = require('../controllers/labReports.controller');

const router = express.Router();

/**
 * Files are held in memory rather than spooled to disk: they go straight to
 * Supabase Storage and to the OCR pipeline's temp file, so a second copy on
 * the API box buys nothing.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    // Only what the OCR router can read; anything else would be stored unreadable.
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}. Upload a PDF or a photo.`));
  },
});

router.use(authGuard);

// A file the patient uploaded — stored, then run through the OCR pipeline.
router.post('/upload', upload.single('file'), uploadReport);

// A payload an external pipeline already extracted.
router.post('/', validateBody(ocrPayloadSchema), ingestReport);

router.get('/', listReportsForPatient);
router.get('/history', roleGuard('clinician'), listSharedHistory);
router.get('/trend/:standardKey', getMetricTrend);
router.get('/triage/queue', roleGuard('clinician'), listTriageQueue);

// Which of the patient's reports this appointment may see.
router.post('/share-all', roleGuard('patient'), validateBody(shareReportSchema), shareAllReports);
router.post('/:reportId/share', validateBody(shareReportSchema), shareReportWithAppointment);
router.delete('/:reportId/share/:appointmentId', unshareReportFromAppointment);
router.delete('/:reportId', deleteReport);

router.patch(
  '/metrics/:metricId/review',
  roleGuard('clinician'),
  validateBody(reviewMetricSchema),
  reviewMetric
);

module.exports = router;
