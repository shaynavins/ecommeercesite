/**
 * Lynq runtime bridge
 *
 * This preserves existing frontend calls while Lynq-owned generated APIs are
 * introduced. It intentionally handles common legacy REST paths so apps keep
 * working even when static rewriting cannot safely edit a local request helper.
 */

const LYNQ_GENERATED_BACKEND_URL = "http://localhost:3001";
const LYNQ_PROJECT_ID = "ed0459a9-4952-4edd-913b-0ecbb9a0383c";

type JsonRecord = Record<string, unknown>;

const originalFetch = globalThis.fetch.bind(globalThis);

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function readJson(init?: RequestInit): Promise<JsonRecord> {
  if (!init?.body || typeof init.body !== 'string') {
    return {};
  }
  try {
    return JSON.parse(init.body) as JsonRecord;
  } catch {
    return {};
  }
}

function normalizeUser(user: JsonRecord | null | undefined): JsonRecord | null {
  if (!user) return null;
  const profile = (user.profile && typeof user.profile === 'object' ? user.profile : {}) as JsonRecord;
  return {
    ...user,
    name: user.name ?? profile.name ?? profile.displayName ?? null,
    emailVerified: user.emailVerified ?? user.email_verified,
  };
}

function normalizeSessionResponse(payload: JsonRecord): JsonRecord {
  const session = (payload.session && typeof payload.session === 'object' ? payload.session : payload) as JsonRecord;
  return {
    ...session,
    user: normalizeUser(session.user as JsonRecord),
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ response: Response; payload: JsonRecord | null }> {
  const response = await originalFetch(url, init);
  const text = await response.text();
  if (!text) {
    return { response, payload: null };
  }
  try {
    return { response, payload: JSON.parse(text) as JsonRecord };
  } catch {
    return { response, payload: { message: text } };
  }
}

function projectAuthPath(path: string) {
  if (!LYNQ_PROJECT_ID) {
    throw new Error('LYNQ project id is required for generated auth calls.');
  }
  return `/api/lynq/platform/projects/${LYNQ_PROJECT_ID}/auth${path}`;
}

async function handleAuthRequest(path: string, method: string, init?: RequestInit): Promise<Response | null> {
  if (!path.startsWith('/api/auth/')) {
    return null;
  }

  const body = await readJson(init);
  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  } as HeadersInit;

  if (method === 'POST' && /\/(signup|sign-up|register|users)$/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/users'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        profile: body.profile ?? { name: body.name },
        emailVerified: body.emailVerified ?? false,
      }),
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    return jsonResponse({ ...payload, user: normalizeUser(payload.user as JsonRecord) }, { status: response.status });
  }

  if (method === 'POST' && /\/(login|signin|sign-in|sessions?)$/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/sessions'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    return jsonResponse(normalizeSessionResponse(payload), { status: response.status });
  }

  if (method === 'POST' && /\/(refresh|refresh-session)$/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/refresh'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ refreshToken: body.refreshToken }),
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    return jsonResponse(normalizeSessionResponse(payload), { status: response.status });
  }

  if (method === 'GET' && /\/(me|session|current-user|current_user)$/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/session'), {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    const session = normalizeSessionResponse(payload);
    return jsonResponse({ user: session.user }, { status: response.status });
  }

  if (method === 'POST' && /google|oauth/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/oauth/google'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ credential: body.credential ?? body.idToken ?? body.token }),
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    return jsonResponse(normalizeSessionResponse(payload), { status: response.status });
  }

  if (method === 'POST' && /send-verification/.test(path)) {
    return originalFetch(projectAuthPath('/email/send-verification'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  if (method === 'POST' && /send-reset-password/.test(path)) {
    return originalFetch(projectAuthPath('/email/send-reset-password'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  if (method === 'POST' && /email\/verify/.test(path)) {
    const { response, payload } = await fetchJson(projectAuthPath('/email/verify'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
    return jsonResponse(normalizeSessionResponse(payload), { status: response.status });
  }

  if (method === 'POST' && /reset-password/.test(path)) {
    return originalFetch(projectAuthPath('/email/reset-password'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  return null;
}

async function handleProfileRequest(path: string, method: string, init?: RequestInit): Promise<Response | null> {
  if (!/^\/api\/(profile|user|users)\/current$/.test(path)) {
    return null;
  }
  const headers = init?.headers || {};
  const { response, payload } = await fetchJson(projectAuthPath('/session'), {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!response.ok || !payload) return jsonResponse(payload ?? { error: response.statusText }, response);
  const session = normalizeSessionResponse(payload);
  if (method === 'PUT' || method === 'PATCH') {
    const body = await readJson(init);
    return jsonResponse({ ...(session.user as JsonRecord), ...body }, { status: 200 });
  }
  return jsonResponse(session.user, { status: 200 });
}

async function handleGeneratedBackendRequest(path: string, init?: RequestInit): Promise<Response | null> {
  if (!path.startsWith('/api/') || path.startsWith('/api/lynq/')) {
    return null;
  }
  if (/^\/api\/(auth|profile|roles)\b/.test(path)) {
    if (path === '/api/roles') return jsonResponse([]);
    return null;
  }
  return originalFetch(`${LYNQ_GENERATED_BACKEND_URL}${path.replace(/^\/api/, '')}`, init);
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const request = input instanceof Request ? input : null;
  const method = (init?.method || request?.method || 'GET').toUpperCase();
  const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  const url = new URL(rawUrl, globalThis.location?.origin || 'http://localhost');

  if (globalThis.location && url.origin !== globalThis.location.origin) {
    return originalFetch(input, init);
  }

  const authResponse = await handleAuthRequest(url.pathname, method, init || request || undefined);
  if (authResponse) return authResponse;

  const profileResponse = await handleProfileRequest(url.pathname, method, init || request || undefined);
  if (profileResponse) return profileResponse;

  const backendResponse = await handleGeneratedBackendRequest(url.pathname, init || request || undefined);
  if (backendResponse) return backendResponse;

  return originalFetch(input, init);
};
