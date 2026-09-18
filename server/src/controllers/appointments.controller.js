const supabaseAdmin = require('../config/supabaseAdminClient');
const { createAndSendInvite } = require('../services/invite.service');

async function createAppointment(req, res, next) {
  try {
    const { patientEmail, patientFullName, scheduledAt } = req.validated;
    const clinicianId = req.user.id;

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        clinician_id: clinicianId,
        scheduled_at: scheduledAt,
        status: 'invited',
      })
      .select()
      .single();

    if (error) throw error;

    await createAndSendInvite({
      appointmentId: appointment.id,
      patientEmail,
      patientFullName,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function listAppointments(req, res, next) {
  try {
    const column = req.user.role === 'clinician' ? 'clinician_id' : 'patient_id';

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq(column, req.user.id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getAppointment(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Appointment not found' });

    const isOwner = data.patient_id === req.user.id || data.clinician_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: 'Not authorized to view this appointment' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { status } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { createAppointment, listAppointments, getAppointment, updateAppointmentStatus };
