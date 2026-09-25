const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const { logVitalSchema } = require('../validators/vitals.validators');
const { logVital, listVitals } = require('../controllers/vitals.controller');

const router = express.Router();

router.use(authGuard);

// Readings are always the caller's own, so only a patient can log them.
router.post('/', roleGuard('patient'), validateBody(logVitalSchema), logVital);
router.get('/', listVitals);

module.exports = router;
