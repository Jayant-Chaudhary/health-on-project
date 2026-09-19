import { supabase } from './supabaseClient.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const USE_MOCK_DATA = String(import.meta.env.VITE_USE_MOCK_DATA) === 'true';

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
 * Runs `live` against the API, falling back to `fallback()` when mock mode is on
 * or the backend is unreachable. Auth/permission errors are re-thrown — those
 * are real failures the clinician needs to see, not a reason to show demo data.
 */
export async function withFallback(live, fallback) {
  if (USE_MOCK_DATA) return fallback();

  try {
    return await live();
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) throw error;
    console.warn('[api] falling back to demo data:', error.message);
    return fallback();
  }
}
