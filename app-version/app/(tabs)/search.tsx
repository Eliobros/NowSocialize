import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiGet, apiPost, apiDelete } from '@/services/api';

interface User {
  _id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  isFollowing: boolean;
}

export default function SearchPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { searchUsers(''); }, []);

  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      const response = await apiGet(`/api/search/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleFollow = async (userId: string) => {
    const response = await apiPost('/api/follow', { userId });
    if (response.ok) {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isFollowing: true, followers: u.followers + 1 } : u));
    }
  };

  const handleUnfollow = async (userId: string) => {
    const response = await apiDelete('/api/follow', { userId });
    if (response.ok) {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isFollowing: false, followers: u.followers - 1 } : u));
    }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/user/${item._id}` as any)}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}><Text style={styles.avatarText}>{getInitials(item.name)}</Text></View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.username ? <Text style={styles.userHandle}>@{item.username}</Text> : null}
          {item.bio ? <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text> : null}
          <Text style={styles.userStats}>{item.followers} seguidores · {item.following} seguindo</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.followButton, item.isFollowing && styles.followingButton]}
          onPress={() => item.isFollowing ? handleUnfollow(item._id) : handleFollow(item._id)}
        >
          <Ionicons name={item.isFollowing ? 'checkmark' : 'person-add'} size={16} color={item.isFollowing ? Colors.primary : Colors.white} />
          <Text style={[styles.followButtonText, item.isFollowing && styles.followingButtonText]}>
            {item.isFollowing ? 'Seguindo' : 'Seguir'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Buscar</Text>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou username..."
          placeholderTextColor={Colors.textMuted}
          value={searchTerm}
          onChangeText={(text) => { setSearchTerm(text); searchUsers(text); }}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 16, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 16, color: Colors.text },
  listContent: { padding: 16, paddingTop: 0 },
  userCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 18 },
  userDetails: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  userHandle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  userBio: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  userStats: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  userActions: { flexDirection: 'row', gap: 8 },
  followButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  followingButton: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primary },
  followButtonText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  followingButtonText: { color: Colors.primary },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
});
