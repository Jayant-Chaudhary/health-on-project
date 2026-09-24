const supabaseAdmin = require('../config/supabaseAdminClient');
const { createAndSendInvite } = require('../services/invite.service');

async function createAppointment(req, res, next) {
  try {
    const { patientEmail, patientFullName, scheduledAt, questionnaireTemplateIds = [], newQuestions = [] } = req.validated;
    const clinicianId = req.user.id;

    // 1. Check if user already exists
    const { data: existingProfiles, error: profileSearchError } = await supabaseAdmin.auth.admin.listUsers();
    let existingAuthUser = existingProfiles?.users?.find((u) => u.email === patientEmail);
    
    let patientId = null;
    let appointmentStatus = 'invited';
    
    if (existingAuthUser) {
      // User exists, so we attach the appointment directly to them
      patientId = existingAuthUser.id;
      appointmentStatus = 'active'; // Or whatever status means it's ready to go without an invite
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        clinician_id: clinicianId,
        patient_id: patientId,
        scheduled_at: scheduledAt,
        status: appointmentStatus,
      })
      .select()
      .single();

    if (error) throw error;

    // Handle new questions
    const finalTemplateIds = [...questionnaireTemplateIds];
    
    for (const q of newQuestions) {
      if (q.saveToList) {
        // Save to clinician's template list
        const { data: template, error: tmplError } = await supabaseAdmin
          .from('questionnaire_templates')
          .insert({
            question_text: q.text,
            clinician_id: clinicianId,
            is_active: true,
          })
          .select('id')
          .single();
          
        if (!tmplError && template) {
          finalTemplateIds.push(template.id);
        }
      } else {
        // Just add as an appointment-specific template (not linked to clinician_id or not active for global)
        const { data: template, error: tmplError } = await supabaseAdmin
          .from('questionnaire_templates')
          .insert({
            question_text: q.text,
            clinician_id: clinicianId,
            is_active: false, // hidden from main list
          })
          .select('id')
          .single();
          
        if (!tmplError && template) {
          finalTemplateIds.push(template.id);
        }
      }
    }

    // Insert join table records for appointment_questionnaires
    if (finalTemplateIds.length > 0) {
      const joinRecords = finalTemplateIds.map(tid => ({
        appointment_id: appointment.id,
        template_id: tid,
      }));
      
      const { error: joinError } = await supabaseAdmin
        .from('appointment_questionnaires')
        .insert(joinRecords);
        
      if (joinError) console.error('Failed to link questionnaires:', joinError);
    }

    let responsePayload = { ...appointment };

    if (!patientId) {
      // Create and send invite only if the user does NOT exist
      const invite = await createAndSendInvite({
        appointmentId: appointment.id,
        patientEmail,
        patientFullName,
      });
      responsePayload._devInviteLink = process.env.NODE_ENV !== 'production' ? `${process.env.CLIENT_APP_URL || 'http://localhost:5173'}/invite/${invite.token}` : undefined;
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

async function listAppointments(req, res, next) {
  try {
    const column = req.user.role === 'clinician' ? 'clinician_id' : 'patient_id';

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*, clinician:profiles!appointments_clinician_id_fkey(full_name, phone), patient:profiles!appointments_patient_id_fkey(full_name, phone), appointment_invites(patient_email)')
      .eq(column, req.user.id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getAppointment(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Appointment not found' });

    const isOwner = data.patient_id === req.user.id || data.clinician_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: 'Not authorized to view this appointment' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { status } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { createAppointment, listAppointments, getAppointment, updateAppointmentStatus };
