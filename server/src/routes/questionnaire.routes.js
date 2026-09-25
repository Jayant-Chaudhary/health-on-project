const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const {
  submitResponsesSchema,
  createTemplateSchema,
  updateTemplateSchema,
} = require('../validators/questionnaire.validators');
const {
  listTemplates,
  getTemplatesForAppointment,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  submitResponses,
  getResponsesForAppointment,
} = require('../controllers/questionnaire.controller');

const router = express.Router();

router.use(authGuard);

router.get('/templates', roleGuard('clinician'), listTemplates);
router.get('/appointment/:appointmentId', getTemplatesForAppointment);
router.post('/templates', roleGuard('clinician'), validateBody(createTemplateSchema), createTemplate);
router.patch('/templates/:id', roleGuard('clinician'), validateBody(updateTemplateSchema), updateTemplate);
router.delete('/templates/:id', roleGuard('clinician'), deleteTemplate);
router.post('/responses', roleGuard('patient'), validateBody(submitResponsesSchema), submitResponses);
router.get('/responses/:appointmentId', getResponsesForAppointment);

module.exports = router;
