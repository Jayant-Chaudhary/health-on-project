import { supabase } from './supabaseClient.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function authHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Thin fetch wrapper: attaches the Supabase JWT and unwraps JSON errors. */
export async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }

  return response.status === 204 ? null : response.json();
}

/**
 * Multipart upload. The browser must set its own multipart boundary, so this
 * deliberately does not send a Content-Type header.
 */
export async function upload(path, formData, { method = 'POST' } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: await authHeader(),
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.error || `Upload failed (${response.status})`, response.status);
  }

  return response.json();
}
