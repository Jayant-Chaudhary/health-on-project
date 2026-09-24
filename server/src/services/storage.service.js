const crypto = require('crypto');
const path = require('path');
const supabaseAdmin = require('../config/supabaseAdminClient');

const LAB_REPORTS_BUCKET = 'lab-reports';
const PRESCRIPTIONS_BUCKET = 'prescriptions';

/** Signed URLs are short-lived; the client re-requests one when it needs it. */
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Uploads a buffer and returns the storage path.
 *
 * Files are namespaced by owner (`<patientId>/<uuid><ext>`) so a storage
 * policy can be written per user later without moving anything, and so one
 * patient can never guess another's path.
 */
async function uploadFile({ bucket, ownerId, buffer, originalName, contentType }) {
  const extension = path.extname(originalName || '').toLowerCase() || '.bin';
  const storagePath = `${ownerId}/${crypto.randomUUID()}${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: contentType || 'application/octet-stream', upsert: false });

  if (error) {
    throw new Error(`Failed to store file: ${error.message}`);
  }

  return storagePath;
}

/** A time-limited URL for a private object, or null if one cannot be minted. */
async function createSignedUrl(bucket, storagePath, expiresIn = SIGNED_URL_TTL_SECONDS) {
  if (!storagePath) return null;

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.warn(`[storage] could not sign ${bucket}/${storagePath}: ${error.message}`);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function removeFile(bucket, storagePath) {
  if (!storagePath) return;
  const { error } = await supabaseAdmin.storage.from(bucket).remove([storagePath]);
  if (error) console.warn(`[storage] could not remove ${bucket}/${storagePath}: ${error.message}`);
}

module.exports = {
  LAB_REPORTS_BUCKET,
  PRESCRIPTIONS_BUCKET,
  uploadFile,
  createSignedUrl,
  removeFile,
};
