import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    GoogleSignin,
    isSuccessResponse,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../constants/firebaseConfig';

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
});

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    isLoading: boolean;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isGuest: false,
    isLoading: true,
    loginAsGuest: async () => { },
    logout: async () => { },
    signInWithGoogle: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Handle Auth State Changes & Persistence
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                setIsGuest(false);
                setIsLoading(false);
            } else {
                checkGuestStatus();
            }
        });

        return () => unsubscribe();
    }, []);

    const checkGuestStatus = async () => {
        try {
            const guestStatus = await AsyncStorage.getItem('is_guest');
            if (guestStatus === 'true') {
                setIsGuest(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        try {
            // Check if device supports Google Play Services
            await GoogleSignin.hasPlayServices();

            // Sign in with Google
            const response = await GoogleSignin.signIn();

            if (isSuccessResponse(response)) {
                const { idToken } = response.data;

                if (idToken) {
                    // Create Firebase credential with the Google ID token
                    const credential = GoogleAuthProvider.credential(idToken);

                    // Sign in to Firebase with the credential
                    await signInWithCredential(auth, credential);
                    console.log('Successfully signed in with Google!');
                }
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the sign-in');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Sign-in is already in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.error('Play Services not available');
            } else {
                console.error('Google Sign-in error:', error);
            }
        }
    };

    const loginAsGuest = async () => {
        try {
            await AsyncStorage.setItem('is_guest', 'true');
            setIsGuest(true);
        } catch (e) {
            console.error(e);
        }
    };

    const logout = async () => {
        try {
            if (user) {
                // Sign out from Google
                try {
                    await GoogleSignin.signOut();
                } catch (e) {
                    // Ignore if not signed in with Google
                }
                // Sign out from Firebase
                await signOut(auth);
            }
            setIsGuest(false);
            await AsyncStorage.removeItem('is_guest');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isGuest, isLoading, loginAsGuest, logout, signInWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};
