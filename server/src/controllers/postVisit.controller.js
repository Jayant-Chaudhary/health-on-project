const supabaseAdmin = require('../config/supabaseAdminClient');

async function saveNotes(req, res, next) {
  try {
    const { notesText } = req.validated;
    const { appointmentId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('consultation_notes')
      .upsert(
        {
          appointment_id: appointmentId,
          clinician_id: req.user.id,
          notes_text: notesText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'appointment_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function addPrescription(req, res, next) {
  try {
    const { storagePath, typedInstructions } = req.validated;
    const { appointmentId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        appointment_id: appointmentId,
        storage_path: storagePath,
        typed_instructions: typedInstructions || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function addActionItem(req, res, next) {
  try {
    const { label } = req.validated;
    const { appointmentId } = req.params;

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('post_visit_action_items')
      .insert({
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        label,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function getPostVisitSummary(req, res, next) {
  try {
    const { appointmentId } = req.params;

    const [{ data: notes }, { data: prescriptions }, { data: actionItems }] = await Promise.all([
      supabaseAdmin.from('consultation_notes').select('*').eq('appointment_id', appointmentId).maybeSingle(),
      supabaseAdmin.from('prescriptions').select('*').eq('appointment_id', appointmentId),
      supabaseAdmin.from('post_visit_action_items').select('*').eq('appointment_id', appointmentId),
    ]);

    res.json({ notes, prescriptions, actionItems });
  } catch (err) {
    next(err);
  }
}

module.exports = { saveNotes, addPrescription, addActionItem, getPostVisitSummary };
