/**
 * api.ts
 * -------
 * Direct HTTP client for the Roamio FastAPI backend (http://localhost:8000).
 * Replaces the @workspace/api-client-react package with plain fetch calls.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('roamio_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; formData?: URLSearchParams } = {}
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() };

  let body: BodyInit | undefined;
  if (options.formData) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = options.formData.toString();
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterPayload { email: string; password: string; }
export interface UserResponse { id: string; email: string; created_at: string; updated_at: string; }
export interface UserWithProfileResponse extends UserResponse { has_travel_profile: boolean; }
export interface TokenResponse { access_token: string; token_type: string; }

export function register(payload: RegisterPayload): Promise<UserResponse> {
  return request('POST', '/auth/register', { body: payload });
}

/** Login uses OAuth2 form-urlencoded: field name is `username` (not email) */
export function login(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);
  return request('POST', '/auth/login', { formData: form });
}

export function getMe(): Promise<UserWithProfileResponse> {
  return request('GET', '/users/me');
}

// ── Journeys ─────────────────────────────────────────────────────────────────

export interface JourneyRequest { destination: string; days: number; companions?: string; }

export interface JourneySummary {
  trip_id: string;
  destination: string;
  days: number;
  companions: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface JourneyDetail extends JourneySummary {
  itinerary: Record<string, any> | null;
}

export function createJourney(payload: JourneyRequest): Promise<JourneyDetail> {
  return request('POST', '/journeys', { body: payload });
}

export function listJourneys(limit = 20, offset = 0): Promise<JourneySummary[]> {
  return request('GET', `/journeys?limit=${limit}&offset=${offset}`);
}

export function getJourney(tripId: string): Promise<JourneyDetail> {
  return request('GET', `/journeys/${tripId}`);
}

// ── SSE helpers ──────────────────────────────────────────────────────────────

/**
 * Streams POST /journeys/stream via SSE.
 * Calls onTripId once with the trip UUID, then onToken for each text chunk,
 * then onDone / onError at the end.
 */
export function streamJourney(
  payload: JourneyRequest,
  callbacks: {
    onTripId?: (id: string) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (msg: string) => void;
  }
): () => void {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/journeys/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError?.(`HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { callbacks.onDone?.(); return; }
          if (data.startsWith('[ERROR]')) { callbacks.onError?.(data.slice(7).trim()); return; }
          if (data.startsWith('[TRIP_ID]')) { callbacks.onTripId?.(data.slice(9).trim()); continue; }
          callbacks.onToken?.(data);
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') callbacks.onError?.(e?.message ?? 'Stream error');
    }
  })();

  return () => controller.abort();
}

/**
 * Streams POST /chat/stream via SSE.
 */
export function streamChat(
  message: string,
  useProfile: boolean,
  callbacks: {
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (msg: string) => void;
  }
): () => void {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, use_profile: useProfile }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError?.(`HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { callbacks.onDone?.(); return; }
          if (data.startsWith('[ERROR]')) { callbacks.onError?.(data.slice(7).trim()); return; }
          callbacks.onToken?.(data);
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') callbacks.onError?.(e?.message ?? 'Stream error');
    }
  })();

  return () => controller.abort();
}
