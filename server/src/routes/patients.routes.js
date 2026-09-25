const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const { listPatients } = require('../controllers/patients.controller');

const router = express.Router();

router.use(authGuard, roleGuard('clinician'));

router.get('/', listPatients);

module.exports = router;
