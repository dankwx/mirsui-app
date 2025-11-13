import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { feedService, FeedPost } from '../services/api';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 5;

  const loadFeed = async (refresh = false) => {
    if (loading || (!refresh && !hasMore)) return;

    try {
      setLoading(true);
      const currentOffset = refresh ? 0 : offset;
      
      const response = await feedService.getFeed(LIMIT, currentOffset);
      
      if (refresh) {
        setPosts(response.posts);
        setOffset(LIMIT);
        setHasMore(response.posts.length === LIMIT);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setOffset(prev => prev + LIMIT);
        setHasMore(response.posts.length === LIMIT);
      }
    } catch (error) {
      console.error('Erro ao carregar feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    loadFeed(true);
  }, []);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed(false);
    }
  }, [loading, hasMore, offset]);

  const openSpotify = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Erro ao abrir Spotify:', err));
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.display_name || item.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.displayName}>
              {item.display_name || item.username}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.claimedat).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {item.claim_message && (
        <Text style={styles.claimMessage}>{item.claim_message}</Text>
      )}

      <TouchableOpacity 
        style={styles.trackCard}
        onPress={() => openSpotify(item.track_url)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.track_thumbnail }} 
          style={styles.trackThumbnail}
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {item.track_title}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {item.artist_name}
          </Text>
          {item.album_name && (
            <Text style={styles.albumName} numberOfLines={1}>
              {item.album_name}
            </Text>
          )}
          <View style={styles.trackMeta}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>
                #{item.position} • ⭐ {item.discover_rating}/10
              </Text>
            </View>
            <Text style={styles.popularity}>
              Pop: {item.popularity}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.postFooter}>
        <View style={styles.interactionButton}>
          <Text style={styles.interactionText}>❤️ {item.likes_count}</Text>
        </View>
        <View style={styles.interactionButton}>
          <Text style={styles.interactionText}>💬 {item.comments_count}</Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>Feed</Text>
          <Text style={styles.subGreeting}>Olá, @{user?.username}!</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#a855f7" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.emptyText}>Carregando feed...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyText}>Nenhum post no feed ainda</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['rgba(101,69,255,0.45)', 'rgba(5,3,15,0.4)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.backgroundGlow}
        pointerEvents="none"
      />

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
            colors={['#a855f7']}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05030f',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#a855f7',
    fontSize: 18,
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 12,
    color: '#999',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  claimMessage: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 20,
  },
  trackCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  trackThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 2,
  },
  albumName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
  popularity: {
    fontSize: 12,
    color: '#666',
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionText: {
    fontSize: 14,
    color: '#999',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
