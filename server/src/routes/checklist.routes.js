const express = require('express');
const authGuard = require('../middleware/authGuard');
const validateBody = require('../middleware/validateBody');
const { toggleChecklistItemSchema } = require('../validators/checklist.validators');
const { getChecklist, toggleItem } = require('../controllers/checklist.controller');

const router = express.Router();

router.use(authGuard);

router.get('/:appointmentId', getChecklist);
router.patch('/items/:itemId', validateBody(toggleChecklistItemSchema), toggleItem);

module.exports = router;
