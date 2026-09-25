const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabaseAdmin = require('../config/supabaseAdminClient');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
});

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates an invite row for an appointment and emails the patient a magic link.
 */
async function createAndSendInvite({ appointmentId, patientEmail, patientFullName }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + env.inviteTokenTtlHours * 60 * 60 * 1000);

  const { data: invite, error } = await supabaseAdmin
    .from('appointment_invites')
    .insert({
      appointment_id: appointmentId,
      patient_email: patientEmail,
      patient_full_name: patientFullName || null,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  const inviteLink = `${env.clientAppUrl}/invite/${token}`;

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to: patientEmail,
      subject: 'Your appointment is confirmed — set up your account',
      html: `
        <p>Hi ${patientFullName || ''},</p>
        <p>Your appointment has been scheduled on MedBrief. Click below to set your password and view your pre-visit checklist.</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
        <p>This link expires in ${env.inviteTokenTtlHours} hours.</p>
      `,
    });
  } catch (emailErr) {
    console.warn('[Invite Email Notice]: Could not send email via SMTP, but invite token was generated successfully:', emailErr.message);
    console.warn('=> Test Invite Link:', inviteLink);
  }

  // The link is returned so the clinician UI can show and copy it. SMTP is
  // best-effort in development, and an invite the doctor cannot hand over is
  // useless.
  return { ...invite, inviteLink };
}

module.exports = { createAndSendInvite };
