import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Centered API utility wrapper that injects authentication token dynamically
 */
export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  // Retrieve token from Zustand store state
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Network response error';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = await response.text() || errorMessage;
    }
    
    // Auto logout if session has expired or is unauthorized
    if (response.status === 401 || response.status === 403) {
      if (token) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    throw new Error(errorMessage);
  }

  // Handle empty bodies (e.g. 204 status)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  
  return null as unknown as Promise<T>;
}
