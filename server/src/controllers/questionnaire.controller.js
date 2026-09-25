const supabaseAdmin = require('../config/supabaseAdminClient');
const { assertAppointmentAccess } = require('../services/access.service');

/** The signed-in clinician's own pre-visit question library. */
async function listTemplates(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('*')
      .eq('is_active', true)
      .eq('clinician_id', req.user.id)
      .order('sort_order', { ascending: true })
      .order('question_text', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * The questions the clinician picked for one appointment. None picked means
 * no questionnaire: the patient skips straight to the checklist.
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

    res.json(chosen);
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { questionText, isRedFlagTrigger = false } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .insert({
        question_text: questionText,
        is_red_flag_trigger: isRedFlagTrigger,
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

async function updateTemplate(req, res, next) {
  try {
    const { questionText, isRedFlagTrigger } = req.validated;
    const changes = {};
    if (questionText !== undefined) changes.question_text = questionText;
    if (isRedFlagTrigger !== undefined) changes.is_red_flag_trigger = isRedFlagTrigger;

    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .update(changes)
      .eq('id', req.params.id)
      .eq('clinician_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Question not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Removes a question from the library. Soft delete: appointments that
 * already asked it, and the answers to it, keep their question text.
 */
async function deleteTemplate(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('questionnaire_templates')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('clinician_id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Question not found' });

    res.status(204).send();
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

module.exports = {
  listTemplates,
  getTemplatesForAppointment,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  submitResponses,
  getResponsesForAppointment,
};
