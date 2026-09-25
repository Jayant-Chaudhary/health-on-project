const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const { createTemplateSchema, updateTemplateSchema } = require('../validators/templates.validators');
const {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templates.controller');

const router = express.Router();

router.use(authGuard, roleGuard('clinician'));

router.get('/', listTemplates);
router.post('/', validateBody(createTemplateSchema), createTemplate);
router.patch('/:id', validateBody(updateTemplateSchema), updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
