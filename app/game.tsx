import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { saveGameRecord, syncToFirebase } from '@/services/gameHistoryService';

const { width } = Dimensions.get('window');
const GRID_SIZE = width - 32;
const CELL_SIZE = GRID_SIZE / 9;

type CellValue = number | null;

export default function GameScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const hasSavedRecord = useRef(false);
    const params = useLocalSearchParams<{
        puzzle?: string;
        solution?: string;
        difficulty?: string;
    }>();

    const [grid, setGrid] = useState<CellValue[][]>([]);
    const [solution, setSolution] = useState<CellValue[][]>([]);
    const [originalPuzzle, setOriginalPuzzle] = useState<CellValue[][]>([]);
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [timer, setTimer] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [score, setScore] = useState(0);
    const difficulty = params.difficulty || 'medium';

    // Parse puzzle data from params
    useEffect(() => {
        if (params.puzzle && params.solution) {
            try {
                const puzzleData: CellValue[][] = JSON.parse(params.puzzle);
                const solutionData: CellValue[][] = JSON.parse(params.solution);

                // Convert 0s to nulls for empty cells
                const formattedPuzzle = puzzleData.map(row =>
                    row.map(cell => (cell === 0 ? null : cell))
                );
                const formattedSolution = solutionData.map(row =>
                    row.map(cell => (cell === 0 ? null : cell))
                );

                setGrid(formattedPuzzle);
                setOriginalPuzzle(formattedPuzzle.map(row => [...row]));
                setSolution(formattedSolution);
            } catch (e) {
                console.error('Error parsing puzzle data:', e);
            }
        } else {
            // Fallback: empty grid if no puzzle provided
            const emptyGrid = Array(9).fill(null).map(() => Array(9).fill(null));
            setGrid(emptyGrid);
            setOriginalPuzzle(emptyGrid);
            setSolution(emptyGrid);
        }
    }, [params.puzzle, params.solution]);

    // Timer - stops when paused or completed
    useEffect(() => {
        if (isPaused || isCompleted) return;

        const interval = setInterval(() => {
            setTimer(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isPaused, isCompleted]);

    // Check for win condition
    const checkWin = useCallback((currentGrid: CellValue[][]) => {
        if (solution.length === 0) return false;

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (currentGrid[i][j] !== solution[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }, [solution]);

    // Calculate score
    const calculateScore = useCallback(() => {
        const baseScore = 1000;
        const timePenalty = timer; // -1 point per second
        const mistakePenalty = mistakes * 50; // -50 per mistake

        let difficultyMultiplier = 1;
        if (difficulty === 'medium') difficultyMultiplier = 1.5;
        if (difficulty === 'hard') difficultyMultiplier = 2;

        const finalScore = Math.max(0, Math.floor((baseScore - timePenalty - mistakePenalty) * difficultyMultiplier));
        return finalScore;
    }, [timer, mistakes, difficulty]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCellPress = (row: number, col: number) => {
        if (isPaused || isCompleted) return;
        // Only allow selecting cells that were not part of original puzzle
        if (originalPuzzle[row]?.[col] === null) {
            setSelectedCell({ row, col });
        }
    };

    const handleNumberPress = (num: number) => {
        if (!selectedCell || isPaused || isCompleted) return;

        const { row, col } = selectedCell;
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = num;
        setGrid(newGrid);

        // Check if correct
        if (solution[row]?.[col] !== num) {
            setMistakes(m => m + 1);
        }

        // Check for win
        if (checkWin(newGrid)) {
            const finalScore = calculateScore();
            setScore(finalScore);
            setIsCompleted(true);

            // Save game record to history
            if (!hasSavedRecord.current) {
                hasSavedRecord.current = true;
                saveGameRecord({
                    difficulty: difficulty as 'easy' | 'medium' | 'hard',
                    score: finalScore,
                    timeSeconds: timer,
                    mistakes: mistakes,
                    completedAt: Date.now(),
                }).then(() => {
                    // If user is logged in, sync to Firebase
                    if (user) {
                        syncToFirebase(user.uid).catch(console.error);
                    }
                }).catch(console.error);
            }
        }
    };

    const handleErase = () => {
        if (!selectedCell || isPaused || isCompleted) return;
        const { row, col } = selectedCell;
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = null;
        setGrid(newGrid);
    };

    const handleRestart = () => {
        setGrid(originalPuzzle.map(row => [...row]));
        setMistakes(0);
        setTimer(0);
        setSelectedCell(null);
        setIsCompleted(false);
        setShowSettings(false);
        setIsPaused(false);
    };

    const handleQuit = () => {
        router.replace('/');
    };

    const getCellStyle = (row: number, col: number) => {
        const styles: any[] = [cellStyles.cell];

        // Thicker borders for 3x3 boxes
        if (col % 3 === 0 && col !== 0) styles.push(cellStyles.leftBorder);
        if (row % 3 === 0 && row !== 0) styles.push(cellStyles.topBorder);

        // Highlight selected cell
        if (selectedCell?.row === row && selectedCell?.col === col) {
            styles.push(cellStyles.selected);
        }

        // Highlight same row/column as selected
        if (selectedCell && (selectedCell.row === row || selectedCell.col === col)) {
            styles.push(cellStyles.highlighted);
        }

        return styles;
    };

    const getCellTextStyle = (row: number, col: number) => {
        const isOriginal = originalPuzzle[row]?.[col] !== null;
        const isWrong = grid[row]?.[col] !== null && solution[row]?.[col] !== grid[row]?.[col];

        if (isWrong) return [cellStyles.cellText, cellStyles.wrongText];
        if (isOriginal) return [cellStyles.cellText, cellStyles.originalText];
        return [cellStyles.cellText, cellStyles.userText];
    };

    const renderGrid = () => {
        if (grid.length === 0) return null;

        return (
            <View style={styles.gridContainer}>
                {grid.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((cell, colIndex) => (
                            <TouchableOpacity
                                key={`cell-${rowIndex}-${colIndex}`}
                                style={getCellStyle(rowIndex, colIndex)}
                                onPress={() => handleCellPress(rowIndex, colIndex)}
                                disabled={isPaused}
                            >
                                <Text style={getCellTextStyle(rowIndex, colIndex)}>
                                    {cell !== null ? cell : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    // Paused Overlay - hides the puzzle
    const renderPausedOverlay = () => {
        if (!isPaused) return null;

        return (
            <View style={styles.pausedOverlay}>
                <View style={styles.pausedContent}>
                    <Ionicons name="pause-circle" size={80} color="#e94560" />
                    <Text style={styles.pausedTitle}>Game Paused</Text>
                    <TouchableOpacity
                        style={styles.resumeButton}
                        onPress={() => setIsPaused(false)}
                    >
                        <Ionicons name="play" size={24} color="#fff" />
                        <Text style={styles.resumeButtonText}>Resume</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Settings Modal
    const renderSettingsModal = () => (
        <Modal
            visible={showSettings}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSettings(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.settingsModal}>
                    <Text style={styles.settingsTitle}>Settings</Text>

                    <TouchableOpacity
                        style={styles.settingsOption}
                        onPress={() => {
                            setShowSettings(false);
                            setIsPaused(true);
                        }}
                    >
                        <Ionicons name="pause-circle-outline" size={28} color="#4db5ff" />
                        <Text style={styles.settingsOptionText}>Pause Game</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingsOption}
                        onPress={handleRestart}
                    >
                        <Ionicons name="refresh-outline" size={28} color="#fbbf24" />
                        <Text style={styles.settingsOptionText}>Restart Puzzle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingsOption}
                        onPress={handleQuit}
                    >
                        <Ionicons name="exit-outline" size={28} color="#e94560" />
                        <Text style={styles.settingsOptionText}>Quit to Menu</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowSettings(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Completion Modal
    const renderCompletionModal = () => (
        <Modal
            visible={isCompleted}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.completionModal}>
                    <Ionicons name="trophy" size={80} color="#fbbf24" />
                    <Text style={styles.completionTitle}>Congratulations!</Text>
                    <Text style={styles.completionSubtitle}>You solved the puzzle!</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Time</Text>
                            <Text style={styles.statValue}>{formatTime(timer)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Mistakes</Text>
                            <Text style={styles.statValue}>{mistakes}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Difficulty</Text>
                            <Text style={styles.statValue}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
                        </View>
                    </View>

                    <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>Score</Text>
                        <Text style={styles.scoreValue}>{score}</Text>
                    </View>

                    <View style={styles.completionButtons}>
                        <TouchableOpacity
                            style={styles.playAgainButton}
                            onPress={() => router.replace('/difficulty')}
                        >
                            <Ionicons name="play" size={20} color="#fff" />
                            <Text style={styles.playAgainText}>Play Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.homeButton}
                            onPress={handleQuit}
                        >
                            <Ionicons name="home" size={20} color="#e94560" />
                            <Text style={styles.homeButtonText}>Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

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
                    <Text style={styles.timer}>{formatTime(timer)}</Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => setShowSettings(true)}
                    >
                        <Ionicons name="settings-outline" size={24} color="#e94560" />
                    </TouchableOpacity>
                </View>

                {/* Game Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.difficulty}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
                    <Text style={styles.mistakes}>Mistakes: {mistakes}/3</Text>
                </View>

                {/* Sudoku Grid */}
                <View style={styles.gridWrapper}>
                    {renderGrid()}
                    {renderPausedOverlay()}
                </View>

                {/* Number Pad */}
                <View style={styles.numpad}>
                    {Array.from({ length: 9 }).map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.numButton}
                            onPress={() => handleNumberPress(i + 1)}
                            disabled={isPaused || isCompleted}
                        >
                            <Text style={[styles.numText, (isPaused || isCompleted) && styles.disabledText]}>
                                {i + 1}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleErase}
                        disabled={isPaused || isCompleted}
                    >
                        <Ionicons name="backspace-outline" size={28} color={isPaused || isCompleted ? '#666' : '#fff'} />
                        <Text style={[styles.actionText, (isPaused || isCompleted) && styles.disabledText]}>Erase</Text>
                    </TouchableOpacity>
                </View>

                {renderSettingsModal()}
                {renderCompletionModal()}
            </SafeAreaView>
        </LinearGradient>
    );
}

const cellStyles = StyleSheet.create({
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderWidth: 0.5,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    leftBorder: {
        borderLeftWidth: 2,
        borderLeftColor: '#000',
    },
    topBorder: {
        borderTopWidth: 2,
        borderTopColor: '#000',
    },
    selected: {
        backgroundColor: '#c8e6ff',
    },
    highlighted: {
        backgroundColor: '#e8f4ff',
    },
    cellText: {
        fontSize: 20,
        fontWeight: '600',
    },
    originalText: {
        color: '#000',
    },
    userText: {
        color: '#4a90d9',
    },
    wrongText: {
        color: '#e94560',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    settingsButton: {
        padding: 8,
    },
    timer: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        fontVariant: ['tabular-nums'],
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    difficulty: {
        color: '#a0a0a0',
        fontSize: 16,
    },
    mistakes: {
        color: '#e94560',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gridWrapper: {
        position: 'relative',
    },
    gridContainer: {
        width: GRID_SIZE,
        height: GRID_SIZE,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#000',
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
    },
    numpad: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        paddingHorizontal: 10,
    },
    numButton: {
        width: (width - 60) / 9,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numText: {
        fontSize: 28,
        color: '#4db5ff',
        fontWeight: '500',
    },
    disabledText: {
        color: '#666',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        gap: 20,
    },
    actionButton: {
        alignItems: 'center',
        padding: 12,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
    },
    // Paused Overlay
    pausedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 46, 0.98)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pausedContent: {
        alignItems: 'center',
    },
    pausedTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
        marginBottom: 30,
    },
    resumeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e94560',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    resumeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsModal: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 24,
        width: width - 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    settingsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 24,
    },
    settingsOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    settingsOptionText: {
        color: '#fff',
        fontSize: 18,
    },
    closeButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 12,
    },
    closeButtonText: {
        color: '#a0a0a0',
        fontSize: 16,
    },
    // Completion Modal
    completionModal: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 32,
        width: width - 40,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    completionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
    },
    completionSubtitle: {
        fontSize: 16,
        color: '#a0a0a0',
        marginTop: 8,
        marginBottom: 24,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#a0a0a0',
        fontSize: 14,
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 4,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    scoreLabel: {
        color: '#fbbf24',
        fontSize: 16,
    },
    scoreValue: {
        color: '#fbbf24',
        fontSize: 48,
        fontWeight: 'bold',
    },
    completionButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    playAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e94560',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
    },
    playAgainText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    homeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#e94560',
        gap: 8,
    },
    homeButtonText: {
        color: '#e94560',
        fontSize: 16,
        fontWeight: '600',
    },
});
