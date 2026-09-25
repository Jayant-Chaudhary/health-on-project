const supabaseAdmin = require('../config/supabaseAdminClient');
const { assertAppointmentAccess } = require('../services/access.service');

/** The shared library plus, for a clinician, their own saved questions. */
async function listTemplates(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('*')
      .eq('is_active', true)
      .or(`clinician_id.is.null,clinician_id.eq.${req.user.id}`)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * The questions for one appointment: the ones the clinician picked when
 * scheduling it, or the shared default set when they picked none.
 */
async function getTemplatesForAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { data, error } = await supabaseAdmin
      .from('appointment_questionnaires')
      .select('template_id, questionnaire_templates ( * )')
      .eq('appointment_id', appointmentId);

    if (error) throw error;

    const chosen = (data || [])
      .map((row) => row.questionnaire_templates)
      .filter(Boolean)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (chosen.length > 0) return res.json(chosen);

    const { data: defaults, error: defaultsError } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('*')
      .eq('is_active', true)
      .is('clinician_id', null)
      .order('sort_order', { ascending: true });

    if (defaultsError) throw defaultsError;

    res.json(defaults);
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { questionText } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .insert({
        question_text: questionText,
        clinician_id: req.user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Stores the patient's answers. Re-submitting replaces the earlier set, so
 * going back through check-in never leaves duplicate answers behind.
 */
async function submitResponses(req, res, next) {
  try {
    const { appointmentId, responses } = req.validated;

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { error: clearError } = await supabaseAdmin
      .from('questionnaire_responses')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('patient_id', req.user.id);

    if (clearError) throw clearError;

    const rows = responses.map((r) => ({
      appointment_id: appointmentId,
      patient_id: req.user.id,
      template_id: r.templateId,
      answer: r.answer,
      detail: r.detail || null,
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
    const access = await assertAppointmentAccess(req.params.appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('*, questionnaire_templates ( question_text, is_red_flag_trigger )')
      .eq('appointment_id', req.params.appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listTemplates, getTemplatesForAppointment, createTemplate, submitResponses, getResponsesForAppointment };
