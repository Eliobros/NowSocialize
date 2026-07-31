import { API_BASE_URL } from '@/constants/api';
import { getToken, removeToken } from './storage';
import { router } from 'expo-router';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

// Gate baseado em Promise: chamadas 401 concorrentes aguardam a mesma Promise
// em vôo. Elimina o duplo replace() E o duplo removeToken() sem depender de
// timers mágicos (resolve somente após o fluxo terminar de verdade).
let ongoingLogout: Promise<void> | null = null;

function handleUnauthorized() {
  if (ongoingLogout) return ongoingLogout;
  ongoingLogout = (async () => {
    try {
      if (!(await getToken())) return; // já deslogado
      await removeToken();
      try {
        router.replace('/');
      } catch {
        // router pode não estar montado (chamada durante bootstrap);
        // o token já foi removido, então a próxima navegação cai no welcome.
      }
    } catch (err) {
      if (__DEV__) console.warn('[api] Falha ao processar 401:', err);
      throw err;
    }
  })();
  // Garante que a próxima chamada após esta ver `ongoingLogout = null` apenas
  // quando o fluxo de fato concluiu. `.catch` defensivo para evitar unhandled
  // rejection caso o IIFE interno lance fora do try/catch, mantendo diagnóstico
  // em dev para regressões futuras.
  ongoingLogout
    .finally(() => {
      ongoingLogout = null;
    })
    .catch((err) => {
      if (__DEV__) console.warn('[api] logout handler rejeitou:', err);
    });
  return ongoingLogout;
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

  // Sessão expirada / token inválido -> desloga automaticamente
  if (response.status === 401) {
    if (__DEV__) console.warn('[api] 401 recebido em', endpoint);
    handleUnauthorized();
  }

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
