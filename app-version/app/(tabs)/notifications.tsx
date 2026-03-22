import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiGet, apiPut } from '@/services/api';

interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'share';
  message: string;
  from: { _id: string; name: string; username: string; avatar: string };
  read: boolean;
  createdAt: string;
  postId?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiGet('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch {} finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const markAllRead = async () => {
    try {
      const response = await apiPut('/api/notifications/read-all');
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch {}
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await apiPut(`/api/notifications/${notif._id}/read`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
    }
    if (notif.type === 'follow') router.push(`/user/${notif.from._id}` as any);
    else if (notif.postId) router.push(`/post/${notif.postId}` as any);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Ionicons name="heart" size={20} color="#EF4444" />;
      case 'comment': return <Ionicons name="chatbubble" size={20} color={Colors.primary} />;
      case 'follow': return <Ionicons name="person-add" size={20} color="#22C55E" />;
      case 'share': return <Ionicons name="share" size={20} color="#22C55E" />;
      default: return <Ionicons name="notifications" size={20} color={Colors.textMuted} />;
    }
  };

  const formatDate = (dateString: string) => {
    const diffH = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return 'Agora';
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <Text style={styles.topBarTitle}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma notificação</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.read && styles.unreadCard]}
            onPress={() => handleNotificationClick(item)}
          >
            <View style={styles.notifRow}>
              {item.from.avatar ? (
                <Image source={{ uri: item.from.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}><Text style={styles.avatarText}>{getInitials(item.from.name)}</Text></View>
              )}
              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  {getIcon(item.type)}
                  <Text style={styles.notifName}>{item.from.name}</Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  badge: { backgroundColor: Colors.error, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  markAllText: { color: Colors.primary, fontSize: 13, marginTop: 4 },
  listContent: { padding: 16 },
  notifCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  unreadCard: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifName: { fontWeight: '600', color: Colors.text, fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  notifMessage: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  notifTime: { fontSize: 12, color: Colors.textMuted },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
});
