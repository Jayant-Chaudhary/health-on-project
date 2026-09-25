const supabaseAdmin = require('../config/supabaseAdminClient');
const { assertAppointmentAccess, assertRowAccessViaAppointment } = require('../services/access.service');
const {
  PRESCRIPTIONS_BUCKET,
  createSignedUrl,
  uploadFile,
  removeFile,
} = require('../services/storage.service');

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

/**
 * Stores an uploaded prescription file and records it against the visit.
 * The file is removed again if the database write fails, so storage never
 * holds a prescription nobody can find.
 */
async function uploadPrescription(req, res, next) {
  let storagePath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { appointmentId } = req.params;
    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const ownerId = access.appointment.patient_id;
    if (!ownerId) {
      return res.status(409).json({ error: 'The patient has not accepted their invite yet' });
    }

    storagePath = await uploadFile({
      bucket: PRESCRIPTIONS_BUCKET,
      ownerId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const typedInstructions = (req.body.typedInstructions || '').trim();

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

    res.status(201).json({
      ...data,
      signed_url: await createSignedUrl(PRESCRIPTIONS_BUCKET, storagePath),
    });
  } catch (err) {
    if (storagePath) await removeFile(PRESCRIPTIONS_BUCKET, storagePath);
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

    // The summary is the clinician's to publish: a patient sees it once the
    // clinician ends the visit, not half-written notes mid-consultation.
    const published = access.appointment.status === 'completed';
    if (req.user.role !== 'clinician' && !published) {
      return res.json({ published: false, notes: null, prescriptions: [], actionItems: [], consultationChecklist: [] });
    }

    const [notesResult, prescriptionsResult, actionItemsResult, consultationResult] = await Promise.all([
      supabaseAdmin.from('consultation_notes').select('*').eq('appointment_id', appointmentId).maybeSingle(),
      supabaseAdmin.from('prescriptions').select('*').eq('appointment_id', appointmentId),
      supabaseAdmin
        .from('post_visit_action_items')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('consultation_checklist_items')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true }),
    ]);

    for (const result of [notesResult, prescriptionsResult, actionItemsResult, consultationResult]) {
      if (result.error) throw result.error;
    }

    // The bucket is private, so each prescription gets a short-lived URL.
    const prescriptions = await Promise.all(
      (prescriptionsResult.data || []).map(async (prescription) => ({
        ...prescription,
        signed_url: await createSignedUrl(PRESCRIPTIONS_BUCKET, prescription.storage_path),
      }))
    );

    res.json({
      published,
      notes: notesResult.data,
      prescriptions,
      actionItems: actionItemsResult.data || [],
      consultationChecklist: consultationResult.data || [],
    });
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

/** Takes an action item back off the patient's next steps. */
async function deleteActionItem(req, res, next) {
  try {
    const access = await assertRowAccessViaAppointment('post_visit_action_items', req.params.itemId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { error } = await supabaseAdmin.from('post_visit_action_items').delete().eq('id', req.params.itemId);
    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** Ticks a consultation checklist item for this visit. Ticking twice is a no-op. */
async function addConsultationItem(req, res, next) {
  try {
    const { label } = req.validated;
    const { appointmentId } = req.params;

    const access = await assertAppointmentAccess(appointmentId, req.user);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { data, error } = await supabaseAdmin
      .from('consultation_checklist_items')
      .upsert(
        { appointment_id: appointmentId, clinician_id: req.user.id, label },
        { onConflict: 'appointment_id,label' }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function deleteConsultationItem(req, res, next) {
  try {
    const access = await assertRowAccessViaAppointment(
      'consultation_checklist_items',
      req.params.itemId,
      req.user
    );
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { error } = await supabaseAdmin
      .from('consultation_checklist_items')
      .delete()
      .eq('id', req.params.itemId);
    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  saveNotes,
  addPrescription,
  uploadPrescription,
  addActionItem,
  getPostVisitSummary,
  toggleActionItem,
  deleteActionItem,
  addConsultationItem,
  deleteConsultationItem,
};
