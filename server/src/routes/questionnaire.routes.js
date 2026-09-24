const express = require('express');
const authGuard = require('../middleware/authGuard');
const validateBody = require('../middleware/validateBody');
const { submitResponsesSchema } = require('../validators/questionnaire.validators');
const {
  listTemplates,
  getTemplatesForAppointment,
  createTemplate,
  submitResponses,
  getResponsesForAppointment,
} = require('../controllers/questionnaire.controller');

const router = express.Router();

router.use(authGuard);

router.get('/templates', listTemplates);
router.get('/appointment/:appointmentId', getTemplatesForAppointment);
router.post('/templates', createTemplate);
router.post('/responses', validateBody(submitResponsesSchema), submitResponses);
router.get('/responses/:appointmentId', getResponsesForAppointment);

module.exports = router;
