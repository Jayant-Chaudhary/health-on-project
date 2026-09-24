const supabaseAdmin = require('../config/supabaseAdminClient');
const { createAndSendInvite } = require('../services/invite.service');

/**
 * Creates an appointment and invites the patient to it.
 *
 * A patient who already has an account is linked to the appointment straight
 * away, so returning patients see the new visit the next time they sign in.
 * They still get an invite email, but it is a notification rather than a
 * sign-up step.
 */
async function createAppointment(req, res, next) {
  try {
    const { patientEmail, patientFullName, scheduledAt } = req.validated;
    const clinicianId = req.user.id;

    const existingPatientId = await findPatientIdByEmail(patientEmail);

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        clinician_id: clinicianId,
        patient_id: existingPatientId,
        scheduled_at: scheduledAt,
        status: 'invited',
      })
      .select()
      .single();

    if (error) throw error;

    const invite = await createAndSendInvite({
      appointmentId: appointment.id,
      patientEmail,
      patientFullName,
    });

    res.status(201).json({
      ...appointment,
      isReturningPatient: Boolean(existingPatientId),
      inviteLink: invite?.inviteLink ?? null,
    });
  } catch (err) {
    next(err);
  }
}

/** The profile id behind an email address, or null if nobody has signed up yet. */
async function findPatientIdByEmail(email) {
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'patient' ? profile.id : null;
}

async function listAppointments(req, res, next) {
  try {
    const column = req.user.role === 'clinician' ? 'clinician_id' : 'patient_id';

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(
        '*, patient:profiles!appointments_patient_id_fkey ( id, full_name, phone ), clinician:profiles!appointments_clinician_id_fkey ( id, full_name )'
      )
      .eq(column, req.user.id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    // An invited patient who has not accepted yet has no profile row, so fall
    // back to the name the clinician typed on the invite.
    const withInviteNames = await attachInviteNames(data);

    res.json(withInviteNames);
  } catch (err) {
    next(err);
  }
}

async function attachInviteNames(appointments) {
  const unlinked = appointments.filter((a) => !a.patient);
  if (unlinked.length === 0) return appointments;

  const { data: invites } = await supabaseAdmin
    .from('appointment_invites')
    .select('appointment_id, patient_full_name, patient_email')
    .in('appointment_id', unlinked.map((a) => a.id));

  const byAppointment = new Map((invites || []).map((i) => [i.appointment_id, i]));

  return appointments.map((appointment) => {
    if (appointment.patient) return appointment;
    const invite = byAppointment.get(appointment.id);
    return {
      ...appointment,
      invited_email: invite?.patient_email ?? null,
      patient: invite?.patient_full_name
        ? { id: null, full_name: invite.patient_full_name, pending: true }
        : null,
    };
  });
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
