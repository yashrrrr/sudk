import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';
import { FirestoreGameRecord, GameRecord } from '../types/gameHistory';

const STORAGE_KEY = 'game_history';

/**
 * Generate a unique ID for local storage
 */
const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get all game history from local storage
 */
export const getGameHistory = async (): Promise<GameRecord[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data) as GameRecord[];
        }
        return [];
    } catch (error) {
        console.error('Error reading game history:', error);
        return [];
    }
};

/**
 * Save a new game record to local storage
 */
export const saveGameRecord = async (
    record: Omit<GameRecord, 'id' | 'synced'>
): Promise<GameRecord> => {
    try {
        const history = await getGameHistory();
        const newRecord: GameRecord = {
            ...record,
            id: generateId(),
            synced: false,
        };

        // Add to beginning of array (newest first)
        const updatedHistory = [newRecord, ...history];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

        return newRecord;
    } catch (error) {
        console.error('Error saving game record:', error);
        throw error;
    }
};

/**
 * Sync unsynced local records to Firebase
 */
export const syncToFirebase = async (userId: string): Promise<number> => {
    try {
        const history = await getGameHistory();
        const unsyncedRecords = history.filter(r => !r.synced);

        if (unsyncedRecords.length === 0) {
            return 0;
        }

        const userHistoryRef = collection(db, 'users', userId, 'gameHistory');

        // Upload each unsynced record
        for (const record of unsyncedRecords) {
            const firestoreRecord: FirestoreGameRecord = {
                difficulty: record.difficulty,
                score: record.score,
                timeSeconds: record.timeSeconds,
                mistakes: record.mistakes,
                completedAt: record.completedAt,
            };
            await addDoc(userHistoryRef, firestoreRecord);
        }

        // Mark all as synced
        const updatedHistory = history.map(r => ({
            ...r,
            synced: true,
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

        return unsyncedRecords.length;
    } catch (error) {
        console.error('Error syncing to Firebase:', error);
        throw error;
    }
};

/**
 * Fetch game history from Firebase and merge with local
 */
export const fetchFromFirebase = async (userId: string): Promise<GameRecord[]> => {
    try {
        const userHistoryRef = collection(db, 'users', userId, 'gameHistory');
        const q = query(userHistoryRef, orderBy('completedAt', 'desc'));
        const snapshot = await getDocs(q);

        const firebaseRecords: GameRecord[] = snapshot.docs.map(doc => {
            const data = doc.data() as FirestoreGameRecord;
            return {
                id: doc.id,
                difficulty: data.difficulty,
                score: data.score,
                timeSeconds: data.timeSeconds,
                mistakes: data.mistakes,
                completedAt: data.completedAt,
                synced: true,
            };
        });

        // Get local history
        const localHistory = await getGameHistory();

        // Merge: keep local unsynced + firebase records (avoid duplicates by timestamp)
        const localUnsynced = localHistory.filter(r => !r.synced);
        const firebaseTimestamps = new Set(firebaseRecords.map(r => r.completedAt));
        const uniqueLocalUnsynced = localUnsynced.filter(r => !firebaseTimestamps.has(r.completedAt));

        // Combine and sort by completedAt (newest first)
        const merged = [...uniqueLocalUnsynced, ...firebaseRecords].sort(
            (a, b) => b.completedAt - a.completedAt
        );

        // Save merged history locally
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        return merged;
    } catch (error) {
        console.error('Error fetching from Firebase:', error);
        // Return local history on error
        return getGameHistory();
    }
};

/**
 * Clear all local game history
 */
export const clearGameHistory = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing game history:', error);
    }
};

/**
 * Get statistics from game history
 */
export const getGameStatistics = async () => {
    const history = await getGameHistory();

    if (history.length === 0) {
        return {
            totalGames: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            averageTime: 0,
            bestTime: 0,
            totalMistakes: 0,
        };
    }

    const totalScore = history.reduce((sum, r) => sum + r.score, 0);
    const totalTime = history.reduce((sum, r) => sum + r.timeSeconds, 0);
    const totalMistakes = history.reduce((sum, r) => sum + r.mistakes, 0);

    return {
        totalGames: history.length,
        totalScore,
        averageScore: Math.round(totalScore / history.length),
        bestScore: Math.max(...history.map(r => r.score)),
        averageTime: Math.round(totalTime / history.length),
        bestTime: Math.min(...history.map(r => r.timeSeconds)),
        totalMistakes,
    };
};
