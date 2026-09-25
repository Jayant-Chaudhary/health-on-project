const supabaseAdmin = require('../config/supabaseAdminClient');
const { assertAppointmentAccess, assertRowAccessViaAppointment } = require('../services/access.service');
const { PRESCRIPTIONS_BUCKET, createSignedUrl } = require('../services/storage.service');

async function saveNotes(req, res, next) {
  try {
    const { notesText } = req.validated;
    const { appointmentId } = req.params;

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

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

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

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

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (!access.appointment.patient_id) {
      return res.status(409).json({ error: 'The patient has not accepted their invite yet' });
    }

    const { data, error } = await supabaseAdmin
      .from('post_visit_action_items')
      .insert({
        appointment_id: appointmentId,
        patient_id: access.appointment.patient_id,
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

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const [notesResult, prescriptionsResult, actionItemsResult] = await Promise.all([
      supabaseAdmin.from('consultation_notes').select('*').eq('appointment_id', appointmentId).maybeSingle(),
      supabaseAdmin.from('prescriptions').select('*').eq('appointment_id', appointmentId),
      supabaseAdmin
        .from('post_visit_action_items')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true }),
    ]);

    for (const result of [notesResult, prescriptionsResult, actionItemsResult]) {
      if (result.error) throw result.error;
    }

    // The bucket is private, so each prescription gets a short-lived URL.
    const prescriptions = await Promise.all(
      (prescriptionsResult.data || []).map(async (prescription) => ({
        ...prescription,
        signed_url: await createSignedUrl(PRESCRIPTIONS_BUCKET, prescription.storage_path),
      }))
    );

    res.json({ notes: notesResult.data, prescriptions, actionItems: actionItemsResult.data || [] });
  } catch (err) {
    next(err);
  }
}

async function toggleActionItem(req, res, next) {
  try {
    const { isCompleted } = req.validated;
    const { itemId } = req.params;

    const access = await assertRowAccessViaAppointment('post_visit_action_items', itemId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { data, error } = await supabaseAdmin
      .from('post_visit_action_items')
      .update({ is_completed: isCompleted })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { saveNotes, addPrescription, addActionItem, getPostVisitSummary, toggleActionItem };
