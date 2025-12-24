import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { fetchFromFirebase, getGameHistory, getGameStatistics, syncToFirebase } from '@/services/gameHistoryService';
import { GameRecord } from '@/types/gameHistory';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [history, setHistory] = useState<GameRecord[]>([]);
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getGameStatistics>> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const loadHistory = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            // If user is logged in, fetch from Firebase
            if (user) {
                const records = await fetchFromFirebase(user.uid);
                setHistory(records);
            } else {
                const records = await getGameHistory();
                setHistory(records);
            }

            const statistics = await getGameStatistics();
            setStats(statistics);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    const handleSync = async () => {
        if (!user || isSyncing) return;

        setIsSyncing(true);
        try {
            await syncToFirebase(user.uid);
            await loadHistory();
        } catch (error) {
            console.error('Error syncing:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return '#a0a0a0';
        }
    };

    const renderGameCard = ({ item }: { item: GameRecord }) => (
        <View style={styles.gameCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
                        {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                    </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.completedAt)}</Text>
            </View>

            <View style={styles.cardStats}>
                <View style={styles.statBox}>
                    <Ionicons name="trophy" size={20} color="#fbbf24" />
                    <Text style={styles.statValue}>{item.score}</Text>
                    <Text style={styles.statLabel}>Score</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                    <Ionicons name="time-outline" size={20} color="#4db5ff" />
                    <Text style={styles.statValue}>{formatTime(item.timeSeconds)}</Text>
                    <Text style={styles.statLabel}>Time</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                    <Ionicons name="close-circle-outline" size={20} color="#e94560" />
                    <Text style={styles.statValue}>{item.mistakes}</Text>
                    <Text style={styles.statLabel}>Mistakes</Text>
                </View>
            </View>

            {!item.synced && (
                <View style={styles.unsyncedBadge}>
                    <Ionicons name="cloud-offline-outline" size={12} color="#a0a0a0" />
                    <Text style={styles.unsyncedText}>Not synced</Text>
                </View>
            )}
        </View>
    );

    const renderStats = () => {
        if (!stats || stats.totalGames === 0) return null;

        return (
            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Your Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statsItem}>
                        <Text style={styles.statsValue}>{stats.totalGames}</Text>
                        <Text style={styles.statsLabel}>Games</Text>
                    </View>
                    <View style={styles.statsItem}>
                        <Text style={[styles.statsValue, { color: '#fbbf24' }]}>{stats.bestScore}</Text>
                        <Text style={styles.statsLabel}>Best Score</Text>
                    </View>
                    <View style={styles.statsItem}>
                        <Text style={[styles.statsValue, { color: '#4db5ff' }]}>{formatTime(stats.bestTime)}</Text>
                        <Text style={styles.statsLabel}>Best Time</Text>
                    </View>
                    <View style={styles.statsItem}>
                        <Text style={styles.statsValue}>{stats.averageScore}</Text>
                        <Text style={styles.statsLabel}>Avg Score</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="game-controller-outline" size={80} color="#4db5ff" />
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptySubtitle}>Complete your first puzzle to see your history here!</Text>
            <TouchableOpacity
                style={styles.playButton}
                onPress={() => router.push('/difficulty')}
            >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.playButtonText}>Start Playing</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
                <SafeAreaView style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4db5ff" />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#e94560" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Game History</Text>
                    {user ? (
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={handleSync}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#4db5ff" />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={24} color="#4db5ff" />
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.syncButton} />
                    )}
                </View>

                {history.length === 0 ? (
                    renderEmpty()
                ) : (
                    <FlatList
                        data={history}
                        renderItem={renderGameCard}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={renderStats}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={() => loadHistory(true)}
                                tintColor="#4db5ff"
                                colors={['#4db5ff']}
                            />
                        }
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#a0a0a0',
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    backButton: {
        padding: 8,
        width: 44,
        alignItems: 'center',
    },
    syncButton: {
        padding: 8,
        width: 44,
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    // Stats Section
    statsContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statsItem: {
        alignItems: 'center',
    },
    statsValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsLabel: {
        fontSize: 12,
        color: '#a0a0a0',
        marginTop: 4,
    },
    // Game Card
    gameCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    difficultyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    difficultyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 13,
        color: '#a0a0a0',
    },
    cardStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        color: '#a0a0a0',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    unsyncedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 4,
    },
    unsyncedText: {
        fontSize: 11,
        color: '#a0a0a0',
    },
    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#a0a0a0',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 24,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e94560',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 32,
        gap: 8,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
