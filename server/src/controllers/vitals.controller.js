const supabaseAdmin = require('../config/supabaseAdminClient');
const { assertAppointmentAccess, resolvePatientScope } = require('../services/access.service');

async function logVital(req, res, next) {
  try {
    const { appointmentId, metricKey, value, unit } = req.validated;

    if (appointmentId) {
      const access = await assertAppointmentAccess(appointmentId, req.user);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
    }

    const { data, error } = await supabaseAdmin
      .from('vitals_logs')
      .insert({
        patient_id: req.user.id,
        appointment_id: appointmentId || null,
        metric_key: metricKey,
        value,
        unit: unit || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function listVitals(req, res, next) {
  try {
    const scope = await resolvePatientScope(req);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
    const { patientId } = scope;

    const { data, error } = await supabaseAdmin
      .from('vitals_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { logVital, listVitals };
