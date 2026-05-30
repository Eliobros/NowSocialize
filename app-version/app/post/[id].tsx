import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiGet, apiPost } from '@/services/api';

interface Comment {
  _id: string;
  content: string;
  author: { _id: string; name: string; username?: string; avatar?: string; };
  createdAt: string;
}

interface Post {
  _id: string;
  content: string;
  image?: string;
  author: { _id: string; name: string; username?: string; avatar?: string; isVerified?: boolean; };
  createdAt: string;
  likes: number;
  likedByUser?: boolean;
}

export default function PostPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => { fetchPost(); }, [id]);

  const fetchPost = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        apiGet(`/api/posts/${id}`),
        apiGet(`/api/posts/${id}/comments`),
      ]);
      if (postRes.ok) { const data = await postRes.json(); setPost(data.post); }
      if (commentsRes.ok) { const data = await commentsRes.json(); setComments(data.comments); }
    } catch {} finally { setLoading(false); }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const response = await apiPost(`/api/posts/${id}/like`);
      if (response.ok) {
        setPost(prev => prev ? { ...prev, likedByUser: !prev.likedByUser, likes: prev.likedByUser ? prev.likes - 1 : prev.likes + 1 } : prev);
      }
    } catch {}
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const response = await apiPost(`/api/posts/${id}/comments`, { content: newComment });
      if (response.ok) { setNewComment(''); fetchPost(); }
    } catch {} finally { setPosting(false); }
  };

  const formatDate = (d: string) => {
    const diffH = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    if (diffH < 1) return 'Agora';
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentCard}>
      <TouchableOpacity onPress={() => router.push(`/profile/${item.author._id}` as any)}>
        {item.author.avatar
          ? <Image source={{ uri: item.author.avatar }} style={styles.commentAvatar} />
          : <View style={styles.commentAvatarFallback}><Text style={styles.commentAvatarText}>{getInitials(item.author.name)}</Text></View>
        }
      </TouchableOpacity>
      <View style={styles.commentBody}>
        <Text style={styles.commentAuthor}>{item.author.name}</Text>
        <Text style={styles.commentContent}>{item.content}</Text>
        <Text style={styles.commentTime}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!post) return <View style={styles.loadingContainer}><Text style={{ color: Colors.textMuted }}>Post não encontrado</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={comments}
        keyExtractor={(item) => item._id}
        renderItem={renderComment}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.postCard}>
            <TouchableOpacity style={styles.postHeader} onPress={() => router.push(`/profile/${post.author._id}` as any)}>
              {post.author.avatar
                ? <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
                : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{getInitials(post.author.name)}</Text></View>
              }
              <View>
                <Text style={styles.authorName}>{post.author.name}{post.author.isVerified && <Text style={styles.verified}> ✓</Text>}</Text>
                <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
              </View>
            </TouchableOpacity>
            {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons name={post.likedByUser ? 'heart' : 'heart-outline'} size={22} color={post.likedByUser ? '#EF4444' : Colors.textSecondary} />
                <Text style={styles.actionText}>{post.likes}</Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.actionText}>{comments.length}</Text>
              </View>
            </View>
            <Text style={styles.commentsTitle}>Comentários</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.noComments}>Nenhum comentário ainda. Seja o primeiro!</Text>}
      />
      <View style={styles.commentInput}>
        <TextInput
          style={styles.input}
          placeholder="Escreve um comentário..."
          placeholderTextColor={Colors.textMuted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={300}
        />
        <TouchableOpacity onPress={handleComment} disabled={posting || !newComment.trim()}>
          {posting
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="send" size={22} color={newComment.trim() ? Colors.primary : Colors.textMuted} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { backgroundColor: Colors.white, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  listContent: { padding: 16, paddingBottom: 80 },
  postCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  authorName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  verified: { color: Colors.primary },
  postTime: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  postContent: { fontSize: 15, color: Colors.text, lineHeight: 22, marginBottom: 12 },
  postImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, color: Colors.textSecondary },
  commentsTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 16 },
  commentCard: { flexDirection: 'row', gap: 10, backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentAvatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: Colors.text },
  commentContent: { fontSize: 14, color: Colors.text, marginTop: 2, lineHeight: 20 },
  commentTime: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  noComments: { textAlign: 'center', color: Colors.textMuted, paddingVertical: 24 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, fontSize: 15, color: Colors.text, maxHeight: 80 },
});
