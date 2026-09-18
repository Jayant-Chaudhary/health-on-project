const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const { ocrPayloadSchema, reviewMetricSchema } = require('../validators/labReports.validators');
const {
  ingestReport,
  listReportsForPatient,
  getMetricTrend,
  reviewMetric,
  listTriageQueue,
} = require('../controllers/labReports.controller');

const router = express.Router();

router.use(authGuard);

router.post('/', validateBody(ocrPayloadSchema), ingestReport);
router.get('/', listReportsForPatient);
router.get('/trend/:standardKey', getMetricTrend);
router.get('/triage/queue', roleGuard('clinician'), listTriageQueue);
router.patch(
  '/metrics/:metricId/review',
  roleGuard('clinician'),
  validateBody(reviewMetricSchema),
  reviewMetric
);

module.exports = router;
