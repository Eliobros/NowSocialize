import { API_BASE_URL } from '@/constants/api';
import { getToken } from './storage';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  return response;
}

export async function apiGet(endpoint: string) {
  return apiRequest(endpoint);
}

export async function apiPost(endpoint: string, body?: any) {
  return apiRequest(endpoint, { method: 'POST', body });
}

export async function apiPut(endpoint: string, body?: any) {
  return apiRequest(endpoint, { method: 'PUT', body });
}

export async function apiDelete(endpoint: string, body?: any) {
  return apiRequest(endpoint, { method: 'DELETE', body });
}
