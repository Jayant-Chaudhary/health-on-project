const supabaseAdmin = require('../config/supabaseAdminClient');
const { TEMPLATE_KINDS } = require('../validators/templates.validators');

/**
 * A doctor's reusable consultation and action items. Every query is scoped
 * to the signed-in clinician: one doctor's lists are never another's.
 */

async function listTemplates(req, res, next) {
  try {
    const { kind } = req.query;
    if (kind && !TEMPLATE_KINDS.includes(kind)) {
      return res.status(400).json({ error: `kind must be one of: ${TEMPLATE_KINDS.join(', ')}` });
    }

    let query = supabaseAdmin
      .from('clinician_templates')
      .select('*')
      .eq('clinician_id', req.user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (kind) query = query.eq('kind', kind);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { kind, label } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('clinician_templates')
      .insert({ clinician_id: req.user.id, kind, label })
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
    const { label, sortOrder } = req.validated;
    const changes = {};
    if (label !== undefined) changes.label = label;
    if (sortOrder !== undefined) changes.sort_order = sortOrder;

    const { data, error } = await supabaseAdmin
      .from('clinician_templates')
      .update(changes)
      .eq('id', req.params.id)
      .eq('clinician_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Template not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/** Soft delete, so nothing that was built from the template loses its origin. */
async function deleteTemplate(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('clinician_templates')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('clinician_id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Template not found' });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
