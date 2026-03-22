import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { apiGet, apiPost, apiRequest } from '@/services/api';
import { API_BASE_URL } from '@/constants/api';

interface Post {
  _id: string;
  content: string;
  image?: string;
  author: {
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  likes: number;
  likedByUser?: boolean;
  commentsCount?: number;
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await apiGet('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch {
      setError('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) return;
    setPosting(true);
    setError('');

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('content', newPost);
        const filename = selectedImage.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: selectedImage, name: filename, type } as any);
        
        const response = await apiRequest('/api/posts', { method: 'POST', body: formData });
        if (response.ok) {
          setNewPost('');
          setSelectedImage(null);
          fetchPosts();
        } else {
          setError('Erro ao criar post');
        }
      } else {
        const response = await apiPost('/api/posts', { content: newPost });
        if (response.ok) {
          setNewPost('');
          fetchPosts();
        } else {
          setError('Erro ao criar post');
        }
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await apiPost(`/api/posts/${postId}/like`);
      if (response.ok) {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            return { ...p, likedByUser: !p.likedByUser, likes: p.likedByUser ? p.likes - 1 : p.likes + 1 };
          }
          return p;
        }));
      }
    } catch {}
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return 'Agora';
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarContainer}>
          {item.author.avatar ? (
            <Image source={{ uri: item.author.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(item.author.name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.authorName}>{item.author.name}</Text>
          <Text style={styles.postTime}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
      {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item._id)}>
          <Ionicons name={item.likedByUser ? 'heart' : 'heart-outline'} size={22} color={item.likedByUser ? '#EF4444' : Colors.textSecondary} />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/post/${item._id}` as any)}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.createPostCard}>
      <TextInput
        style={styles.postInput}
        placeholder="O que você está pensando?"
        placeholderTextColor={Colors.textMuted}
        value={newPost}
        onChangeText={setNewPost}
        multiline
        maxLength={500}
      />
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close-circle" size={28} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.createPostActions}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={22} color={Colors.primary} />
          <Text style={styles.imageButtonText}>Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishButton, (!newPost.trim() && !selectedImage) && styles.disabledButton]}
          onPress={handleCreatePost}
          disabled={posting || (!newPost.trim() && !selectedImage)}
        >
          {posting ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.publishButtonText}>Publicar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Socialize<Text style={styles.topBarHighlight}>Now</Text></Text>
      </View>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum post encontrado. Seja o primeiro a postar!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  topBarHighlight: { color: Colors.primary },
  listContent: { padding: 16, paddingBottom: 32 },
  createPostCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  postInput: { fontSize: 16, color: Colors.text, minHeight: 60, textAlignVertical: 'top' },
  imagePreviewContainer: { position: 'relative', marginTop: 8 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8 },
  createPostActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  imageButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  imageButtonText: { color: Colors.primary, fontWeight: '500' },
  publishButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  publishButtonText: { color: Colors.white, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  postCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  postAuthorInfo: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  postTime: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  postContent: { fontSize: 15, color: Colors.text, lineHeight: 22, marginBottom: 12 },
  postImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' },
});
