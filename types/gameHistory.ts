/**
 * Represents a single completed game record
 */
export interface GameRecord {
    id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    score: number;
    timeSeconds: number;
    mistakes: number;
    completedAt: number; // Unix timestamp
    synced: boolean; // Whether this record has been synced to Firebase
}

/**
 * Firestore document structure for game records
 */
export interface FirestoreGameRecord {
    difficulty: 'easy' | 'medium' | 'hard';
    score: number;
    timeSeconds: number;
    mistakes: number;
    completedAt: number;
}
