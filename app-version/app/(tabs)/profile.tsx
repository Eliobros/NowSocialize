import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { apiGet, apiRequest } from '@/services/api';
import { logout } from '@/services/auth';

interface UserProfile {
  _id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    try {
      const response = await apiGet('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch {} finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const formData = new FormData();
      formData.append('avatar', { uri, name: filename, type } as any);
      const response = await apiRequest('/api/profile/avatar', { method: 'POST', body: formData });
      if (response.ok) fetchProfile();
    } catch {} finally { setUploading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  if (!profile) return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.errorTitle}>Erro ao carregar perfil</Text>
      <Text style={styles.errorSubtitle}>
        Sua sessão pode ter expirado ou há um problema de conexão.
      </Text>
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
          onPress={() => fetchProfile(true)}
          disabled={retrying}
        >
          {retrying ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={retrying}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Sair e entrar novamente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Perfil</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarUpload} disabled={uploading}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileAvatarText}>{getInitials(profile.name)}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="camera" size={16} color={Colors.white} />}
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>
            {profile.name}
            {profile.isVerified && <Text style={styles.verified}> ✓</Text>}
          </Text>
          {profile.username ? <Text style={styles.profileHandle}>@{profile.username}</Text> : null}
          {profile.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.followers}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.following}</Text>
              <Text style={styles.statLabel}>Seguindo</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile' as any)}>
            <Ionicons name="create-outline" size={22} color={Colors.text} />
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
            <Text style={styles.menuText}>Configurações</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/reels' as any)}>
            <Ionicons name="videocam-outline" size={22} color={Colors.text} />
            <Text style={styles.menuText}>Reels</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            <Text style={[styles.menuText, { color: Colors.error }]}>Sair</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 12, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  errorActions: { marginTop: 24, gap: 12, width: '100%', maxWidth: 320 },
  retryButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryButtonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  retryButtonDisabled: { opacity: 0.7 },
  logoutButton: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.error, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutButtonText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  topBarActions: { flexDirection: 'row', gap: 16 },
  scrollContent: { padding: 16 },
  profileHeader: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50 },
  profileAvatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 36 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginTop: 12 },
  verified: { color: Colors.primary },
  profileHandle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  profileBio: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  menuSection: { backgroundColor: Colors.card, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuText: { flex: 1, fontSize: 16, color: Colors.text },
});
