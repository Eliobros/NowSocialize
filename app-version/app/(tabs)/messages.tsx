import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiGet, apiPost } from '@/services/api';
import { getToken } from '@/services/storage';

interface Conversation {
  _id: string;
  participants: { _id: string; name: string; avatar: string; username?: string; isOnline?: boolean }[];
  lastMessage: { content: string; createdAt: string; sender: string };
  unreadCount: number;
  type?: string;
  groupInfo?: { name: string; avatar: string };
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    loadUser();
    fetchConversations();
  }, []);

  const loadUser = async () => {
    const token = await getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch {}
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await apiGet('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const diffH = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return 'Agora';
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const filtered = conversations.filter(c => {
    if (c.type === 'group') return c.groupInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const other = c.participants.find(p => p._id !== currentUserId);
    return other?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isGroup = item.type === 'group';
    const other = item.participants.find(p => p._id !== currentUserId);
    const name = isGroup ? item.groupInfo?.name || 'Grupo' : other?.name || 'Usuário';
    const avatar = isGroup ? item.groupInfo?.avatar : other?.avatar;

    return (
      <TouchableOpacity style={styles.convItem} onPress={() => router.push(`/chat/${item._id}` as any)}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}><Text style={styles.avatarText}>{getInitials(name)}</Text></View>
        )}
        <View style={styles.convInfo}>
          <View style={styles.convRow}>
            <Text style={styles.convName} numberOfLines={1}>{name}</Text>
            <Text style={styles.convTime}>{formatDate(item.lastMessage?.createdAt)}</Text>
          </View>
          <View style={styles.convRow}>
            <Text style={styles.convMessage} numberOfLines={1}>{item.lastMessage?.content || 'Sem mensagens'}</Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Mensagens</Text>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar conversas..."
          placeholderTextColor={Colors.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      <FlatList
        data={filtered}
        renderItem={renderConversation}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma conversa encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 16, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 16, color: Colors.text },
  listContent: { paddingHorizontal: 16 },
  convItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 18 },
  convInfo: { flex: 1, marginLeft: 12 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  convTime: { fontSize: 12, color: Colors.textMuted },
  convMessage: { fontSize: 14, color: Colors.textSecondary, flex: 1, marginTop: 4 },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
});
