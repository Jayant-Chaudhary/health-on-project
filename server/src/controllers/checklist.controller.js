const supabaseAdmin = require('../config/supabaseAdminClient');
const { ensureStaticChecklistItems } = require('../services/checklist.service');

async function getChecklist(req, res, next) {
  try {
    const { appointmentId } = req.params;

    await ensureStaticChecklistItems(appointmentId, req.user.id);

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
