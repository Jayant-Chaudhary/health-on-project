const express = require('express');
const authGuard = require('../middleware/authGuard');
const validateBody = require('../middleware/validateBody');
const { submitResponsesSchema } = require('../validators/questionnaire.validators');
const {
  listTemplates,
  submitResponses,
  getResponsesForAppointment,
} = require('../controllers/questionnaire.controller');

const router = express.Router();

router.use(authGuard);

router.get('/templates', listTemplates);
router.post('/responses', validateBody(submitResponsesSchema), submitResponses);
router.get('/responses/:appointmentId', getResponsesForAppointment);

module.exports = router;
