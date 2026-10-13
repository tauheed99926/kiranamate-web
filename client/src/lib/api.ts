const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('kiranamate_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('kiranamate_token', token);
  } else {
    localStorage.removeItem('kiranamate_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set json content-type if not already set and body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response.text() as Promise<T>;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned unexpected response (${response.status})`);
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
