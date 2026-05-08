import { useAuthStore } from '../store/auth.store';

const BASE_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try refresh token
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${useAuthStore.getState().accessToken}`;
      const retryRes = await fetch(`${BASE_URL}/api/v1${path}`, { ...options, headers });
      if (!retryRes.ok) {
        const errData = await retryRes.json().catch(() => ({}));
        throw new ApiError(
          (errData as { error?: string }).error ?? 'Request failed',
          retryRes.status,
          errData
        );
      }
      return retryRes.json() as Promise<T>;
    }
    useAuthStore.getState().logout();
    throw new ApiError('Session expired', 401);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      (errData as { error?: string }).error ?? 'Request failed',
      res.status,
      errData
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
