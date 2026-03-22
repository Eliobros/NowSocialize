import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { isAuthenticated } from '@/services/auth';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      router.replace('/(tabs)/feed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
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

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/register')}>
          <Text style={styles.primaryButtonText}>Criar Conta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
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
});
