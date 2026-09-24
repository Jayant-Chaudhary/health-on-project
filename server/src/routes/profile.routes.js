const express = require('express');
const authGuard = require('../middleware/authGuard');
const validateBody = require('../middleware/validateBody');
const { patientProfileSchema, clinicianProfileSchema } = require('../validators/profile.validators');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

const router = express.Router();

router.use(authGuard);

router.get('/', getProfile);

/** The body's shape depends on who is signed in, so the schema is chosen per request. */
router.patch(
  '/',
  (req, res, next) => {
    const schema = req.user.role === 'clinician' ? clinicianProfileSchema : patientProfileSchema;
    return validateBody(schema)(req, res, next);
  },
  updateProfile
);

module.exports = router;
