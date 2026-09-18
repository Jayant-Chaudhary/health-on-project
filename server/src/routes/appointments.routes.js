const express = require('express');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validateBody = require('../middleware/validateBody');
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/appointments.validators');
const {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointmentStatus,
} = require('../controllers/appointments.controller');

const router = express.Router();

router.use(authGuard);

router.post('/', roleGuard('clinician'), validateBody(createAppointmentSchema), createAppointment);
router.get('/', listAppointments);
router.get('/:id', getAppointment);
router.patch(
  '/:id/status',
  roleGuard('clinician'),
  validateBody(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

module.exports = router;
