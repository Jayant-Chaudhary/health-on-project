const express = require('express');
const authGuard = require('../middleware/authGuard');
const validateBody = require('../middleware/validateBody');
const { logVitalSchema } = require('../validators/vitals.validators');
const { logVital, listVitals } = require('../controllers/vitals.controller');

const router = express.Router();

router.use(authGuard);

router.post('/', validateBody(logVitalSchema), logVital);
router.get('/', listVitals);

module.exports = router;
