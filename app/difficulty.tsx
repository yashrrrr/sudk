import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function DifficultyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

    const fetchPuzzle = async (difficulty: Difficulty) => {
        setLoading(true);
        setSelectedDifficulty(difficulty);

        try {
            const response = await fetch(
                `https://api.api-ninjas.com/v1/sudokugenerate?difficulty=${difficulty}`,
                {
                    headers: {
                        'X-Api-Key': process.env.EXPO_PUBLIC_SUDOKU_API_KEY || '',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch puzzle');
            }

            const data = await response.json();

            // Navigate to game with puzzle data
            router.push({
                pathname: '/game',
                params: {
                    puzzle: JSON.stringify(data.puzzle),
                    solution: JSON.stringify(data.solution),
                    difficulty: difficulty,
                },
            });
        } catch (error) {
            console.error('Error fetching puzzle:', error);
            alert('Failed to load puzzle. Please try again.');
        } finally {
            setLoading(false);
            setSelectedDifficulty(null);
        }
    };

    const difficulties: { level: Difficulty; label: string; description: string; color: string }[] = [
        {
            level: 'easy',
            label: 'Easy',
            description: 'Perfect for beginners',
            color: '#4ade80',
        },
        {
            level: 'medium',
            label: 'Medium',
            description: 'A balanced challenge',
            color: '#fbbf24',
        },
        {
            level: 'hard',
            label: 'Hard',
            description: 'For Sudoku masters',
            color: '#ef4444',
        },
    ];

    return (
        <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.container}
        >
            <SafeAreaView style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#e94560" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Difficulty</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Difficulty Options */}
                <View style={styles.optionsContainer}>
                    {difficulties.map((item) => (
                        <TouchableOpacity
                            key={item.level}
                            style={[
                                styles.optionButton,
                                { borderColor: item.color },
                            ]}
                            onPress={() => fetchPuzzle(item.level)}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <View style={[styles.difficultyIndicator, { backgroundColor: item.color }]} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={[styles.optionLabel, { color: item.color }]}>
                                        {item.label}
                                    </Text>
                                    <Text style={styles.optionDescription}>{item.description}</Text>
                                </View>
                                {loading && selectedDifficulty === item.level ? (
                                    <ActivityIndicator color={item.color} size="small" />
                                ) : (
                                    <Ionicons name="chevron-forward" size={24} color={item.color} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#a0a0a0" />
                    <Text style={styles.infoText}>
                        Puzzles are generated fresh each time
                    </Text>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 44,
    },
    optionsContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    optionButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 2,
        padding: 20,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    difficultyIndicator: {
        width: 12,
        height: 48,
        borderRadius: 6,
        marginRight: 16,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    optionDescription: {
        fontSize: 14,
        color: '#a0a0a0',
        marginTop: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 30,
        gap: 8,
    },
    infoText: {
        color: '#a0a0a0',
        fontSize: 14,
    },
});
