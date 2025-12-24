import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../constants/firebaseConfig';

// Required for expo-auth-session to work on Android
WebBrowser.maybeCompleteAuthSession();

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

    // Google Auth Request - let the provider handle redirect URI automatically
    // For Expo Go, this uses the auth proxy: https://auth.expo.io/@zypher007/sudoku-classic
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    });

    // Debug: Log the redirect URI
    useEffect(() => {
        if (request) {
            console.log('=== GOOGLE AUTH DEBUG ===');
            console.log('Redirect URI:', request.redirectUri);
            console.log('Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
            console.log('=========================');
        }
    }, [request]);

    // Handle Google Auth Response
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.idToken) {
                const credential = GoogleAuthProvider.credential(authentication.idToken);
                signInWithCredential(auth, credential).catch(error => {
                    console.error('Error signing in with Google:', error);
                });
            } else if (authentication?.accessToken) {
                // Fallback: use access token if no id token
                const credential = GoogleAuthProvider.credential(null, authentication.accessToken);
                signInWithCredential(auth, credential).catch(error => {
                    console.error('Error signing in with Google:', error);
                });
            }
        }
    }, [response]);

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
            await promptAsync();
        } catch (error) {
            console.error('Google Sign-in error:', error);
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

