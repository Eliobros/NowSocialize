import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRequest,  apiGet, apiPost } from '@/services/api';

interface UserProfile {
  _id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
  isFollowing: boolean;
}

export default function UserProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await apiGet(`/api/profile/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setFollowing(data.profile.isFollowing);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleFollow = async () => {
  if (!profile) return;
  setFollowLoading(true);
  try {
    const response = following
      ? await apiRequest('/api/follow', { 
          method: 'DELETE', 
          body: JSON.stringify({ userId: id }) 
        })
      : await apiPost('/api/follow', { userId: id });

    if (response.ok) {
      setFollowing(prev => !prev);
      setProfile(prev => prev ? {
        ...prev,
        followers: following ? prev.followers - 1 : prev.followers + 1,
      } : prev);
    }
  } catch {} finally { setFollowLoading(false); }
};

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  if (!profile) return (
    <View style={styles.loadingContainer}>
      <Text style={{ color: Colors.textMuted }}>Utilizador não encontrado</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{profile.username ? `@${profile.username}` : profile.name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Text style={styles.profileAvatarText}>{getInitials(profile.name)}</Text>
            </View>
          )}
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
          <TouchableOpacity
            style={[styles.followButton, following && styles.followingButton]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading
              ? <ActivityIndicator size="small" color={following ? Colors.primary : Colors.white} />
              : <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
                  {following ? 'Seguindo' : 'Seguir'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  scrollContent: { padding: 16 },
  profileHeader: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50 },
  profileAvatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 36 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginTop: 12 },
  verified: { color: Colors.primary },
  profileHandle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  profileBio: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  followButton: { marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 10, borderRadius: 8 },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  followButtonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  followingButtonText: { color: Colors.primary },
});
