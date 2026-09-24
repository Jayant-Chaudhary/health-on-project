const supabaseAdmin = require('../config/supabaseAdminClient');

/** Days a full-term pregnancy runs, used to derive gestational age. */
const GESTATION_DAYS = 280;

/**
 * Gestational age is derived from the due date rather than stored: a week
 * count written into the database is wrong the day after it is written.
 */
function gestationalDaysFrom(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const daysRemaining = Math.round((due.getTime() - Date.now()) / 86_400_000);
  const elapsed = GESTATION_DAYS - daysRemaining;
  return elapsed >= 0 && elapsed <= GESTATION_DAYS + 28 ? elapsed : null;
}

function shapeProfile(profile, details, role) {
  const base = {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    phone: profile.phone,
    createdAt: profile.created_at,
  };

  if (role === 'clinician') {
    return {
      ...base,
      specialty: details?.specialty ?? null,
      licenseNumber: details?.license_number ?? null,
      stateMedicalCouncil: details?.state_medical_council ?? null,
      isVerified: details?.is_verified ?? false,
    };
  }

  return {
    ...base,
    dateOfBirth: details?.date_of_birth ?? null,
    dueDate: details?.due_date ?? null,
    gestationalDays: gestationalDaysFrom(details?.due_date),
    bloodType: details?.blood_type ?? null,
    gravida: details?.gravida ?? null,
    para: details?.para ?? null,
    address: details?.address ?? null,
    emergencyContactName: details?.emergency_contact_name ?? null,
    emergencyContactPhone: details?.emergency_contact_phone ?? null,
  };
}

function detailsTableFor(role) {
  return role === 'clinician'
    ? { table: 'clinician_details', key: 'profile_id' }
    : { table: 'patient_details', key: 'profile_id' };
}

async function getProfile(req, res, next) {
  try {
    const { id, role } = req.user;
    const { table, key } = detailsTableFor(role);

    const [{ data: profile, error: profileError }, { data: details }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', id).single(),
      supabaseAdmin.from(table).select('*').eq(key, id).maybeSingle(),
    ]);

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(shapeProfile(profile, details, role));
  } catch (err) {
    next(err);
  }
}

/** Only keys the caller actually sent are written, so a partial save cannot blank a field. */
function pickProvided(body, mapping) {
  const row = {};
  for (const [incoming, column] of Object.entries(mapping)) {
    if (incoming in body) row[column] = body[incoming];
  }
  return row;
}

async function updateProfile(req, res, next) {
  try {
    const { id, role } = req.user;
    const body = req.validated;

    const profileRow = pickProvided(body, { fullName: 'full_name', phone: 'phone' });
    if (Object.keys(profileRow).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(profileRow).eq('id', id);
      if (error) throw error;
    }

    const detailMapping =
      role === 'clinician'
        ? {
            specialty: 'specialty',
            licenseNumber: 'license_number',
            stateMedicalCouncil: 'state_medical_council',
          }
        : {
            dateOfBirth: 'date_of_birth',
            dueDate: 'due_date',
            bloodType: 'blood_type',
            gravida: 'gravida',
            para: 'para',
            address: 'address',
            emergencyContactName: 'emergency_contact_name',
            emergencyContactPhone: 'emergency_contact_phone',
          };

    const detailRow = pickProvided(body, detailMapping);
    const { table, key } = detailsTableFor(role);

    if (Object.keys(detailRow).length > 0) {
      const { error } = await supabaseAdmin
        .from(table)
        .upsert({ [key]: id, ...detailRow }, { onConflict: key });
      if (error) throw error;
    }

    return getProfile(req, res, next);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, gestationalDaysFrom, shapeProfile };
