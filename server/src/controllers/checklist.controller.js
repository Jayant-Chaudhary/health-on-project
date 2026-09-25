const supabaseAdmin = require('../config/supabaseAdminClient');
const { ensureStaticChecklistItems } = require('../services/checklist.service');
const { assertAppointmentAccess, assertRowAccessViaAppointment } = require('../services/access.service');

async function getChecklist(req, res, next) {
  try {
    const { appointmentId } = req.params;

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Items belong to the appointment's patient, whoever is looking — a
    // clinician opening the list must not seed it under their own id.
    const { patient_id: patientId } = access.appointment;
    if (patientId) await ensureStaticChecklistItems(appointmentId, patientId);

    const { data, error } = await supabaseAdmin
      .from('pre_visit_checklist_items')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function toggleItem(req, res, next) {
  try {
    const { isCompleted } = req.validated;

    const access = await assertRowAccessViaAppointment('pre_visit_checklist_items', req.params.itemId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { data, error } = await supabaseAdmin
      .from('pre_visit_checklist_items')
      .update({ is_completed: isCompleted })
      .eq('id', req.params.itemId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getChecklist, toggleItem };
