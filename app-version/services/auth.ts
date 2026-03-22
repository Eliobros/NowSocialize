import { apiPost } from './api';
import { setToken, removeToken, getToken } from './storage';

export async function login(email: string, password: string) {
  const response = await apiPost('/api/auth/login', { email, password });
  const data = await response.json();

  if (response.ok) {
    await setToken(data.token);
    return { success: true, data };
  }
  return { success: false, error: data.message || data.error || 'Erro ao fazer login' };
}

export async function register(params: {
  name: string;
  email: string;
  username: string;
  password: string;
  verificationToken: string;
}) {
  const response = await apiPost('/api/auth/register', params);
  const data = await response.json();

  if (response.ok) {
    await setToken(data.token);
    return { success: true, data };
  }
  return { success: false, error: data.message || data.error || 'Erro ao criar conta' };
}

export async function sendVerificationCode(email: string, name: string) {
  const response = await apiPost('/api/auth/send-verification-code', { email, name });
  const data = await response.json();

  if (response.ok) {
    return { success: true, message: data.message };
  }
  return { success: false, error: data.message || data.error || 'Erro ao enviar código' };
}

export async function verifyCode(email: string, code: string) {
  const response = await apiPost('/api/auth/verify-code', { email, code });
  const data = await response.json();

  if (response.ok) {
    return { success: true, verificationToken: data.verificationToken, message: data.message };
  }
  return { success: false, error: data.message || data.error || 'Erro ao verificar código' };
}

export async function logout() {
  await removeToken();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
