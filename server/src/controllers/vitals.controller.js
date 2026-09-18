const supabaseAdmin = require('../config/supabaseAdminClient');

async function logVital(req, res, next) {
  try {
    const { appointmentId, metricKey, value, unit } = req.validated;

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
    const patientId = req.user.role === 'clinician' ? req.query.patientId : req.user.id;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

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
