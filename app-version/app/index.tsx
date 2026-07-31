import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { API_BASE_URL } from '@/constants/api';
import { getToken, removeToken } from '@/services/storage';

export default function WelcomePage() {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Usa fetch cru (sem passar pelo interceptor) para evitar auto-redirect
  // para a rota '/' enquanto já estamos nela (potencial loop).
  const checkAuth = async () => {
    const token = await getToken();
    if (!token) return;

    setValidating(true);
    setValidationError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
      if (res.ok) {
        router.replace('/(tabs)/feed');
        return;
      }
      if (res.status === 401) {
        // Token genuinamente inválido/expirado -> limpa e fica na welcome.
        await removeToken();
        return;
      }
      // Outros não-ok (500, 503): mantém o token e mostra erro.
      setValidationError('Não foi possível validar sua sessão. Tente novamente.');
    } catch (err: any) {
      // Sem rede / timeout / servidor offline -> NÃO redirecionar ao feed
      // (isso recriaria o sintoma original do usuário: feed vazio/quebrado).
      // Apenas mostra o erro e fica na welcome para o usuário decidir.
      if (err?.name === 'AbortError') {
        setValidationError('Servidor demorou demais para responder. Tente novamente.');
      } else {
        setValidationError('Sem conexão com o servidor. Tente novamente.');
      }
    } finally {
      clearTimeout(timeoutId);
      setValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {validating ? (
          <View style={styles.validatingBanner}>
            <Text style={styles.validatingText}>Validando sessão…</Text>
          </View>
        ) : null}
        {validationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{validationError}</Text>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={checkAuth}>
              <Text style={styles.errorRetryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.title}>
          Socialize<Text style={styles.titleHighlight}>Now</Text>
        </Text>
        <Text style={styles.subtitle}>
          Conecte-se com pessoas incríveis, compartilhe momentos especiais e descubra um mundo de possibilidades sociais.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="people" size={32} color={Colors.primary} />
            <Text style={styles.featureTitle}>Conecte-se</Text>
            <Text style={styles.featureDesc}>Encontre amigos e pessoas com interesses similares.</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubbles" size={32} color="#22C55E" />
            <Text style={styles.featureTitle}>Compartilhe</Text>
            <Text style={styles.featureDesc}>Compartilhe seus momentos e experiências.</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={32} color="#EF4444" />
            <Text style={styles.featureTitle}>Interaja</Text>
            <Text style={styles.featureDesc}>Curta, comente e compartilhe conteúdos.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, validating && styles.disabledButton]}
          onPress={() => router.push('/register')}
          disabled={validating}
        >
          <Text style={styles.primaryButtonText}>Criar Conta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, validating && styles.disabledButton]}
          onPress={() => router.push('/login')}
          disabled={validating}
        >
          <Text style={styles.secondaryButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleHighlight: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  validatingBanner: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  validatingText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  errorRetryBtn: {
    backgroundColor: Colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  errorRetryText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: { opacity: 0.5 },
});
