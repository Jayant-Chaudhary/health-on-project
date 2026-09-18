const supabaseAdmin = require('../config/supabaseAdminClient');

async function listTemplates(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function submitResponses(req, res, next) {
  try {
    const { appointmentId, responses } = req.validated;

    const rows = responses.map((r) => ({
      appointment_id: appointmentId,
      patient_id: req.user.id,
      template_id: r.templateId,
      answer: r.answer,
    }));

    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .insert(rows)
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function getResponsesForAppointment(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('*, questionnaire_templates ( question_text, is_red_flag_trigger )')
      .eq('appointment_id', req.params.appointmentId);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listTemplates, submitResponses, getResponsesForAppointment };
