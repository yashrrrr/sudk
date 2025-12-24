import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth'; // Adjusted path

const { width } = Dimensions.get('window');

// ... other imports

export default function LoginScreen() {
  const router = useRouter();
  const { user, logout, isGuest, isLoading, loginAsGuest, signInWithGoogle } = useAuth();

  // Prevent flickering while checking storage
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <Ionicons name="game-controller" size={50} color="#fff" />
      </LinearGradient>
    );
  }

  if (user || isGuest) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <SafeAreaView style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Sudoku</Text>
            <Text style={styles.welcomeText}>
              Welcome, {user?.email?.split('@')[0] || 'Guest'}!
            </Text>
          </View>

          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/difficulty')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#e94560', '#c81d3d']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>New Game</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/history')}
            >
              <Ionicons name="time-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Game History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="settings-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Sudoku</Text>
          <Text style={styles.subtitle}>Classic</Text>
        </View>

        <View style={styles.illustrationContainer}>
          <Ionicons name="grid" size={120} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
          <Ionicons name="game-controller" size={100} color="#fff" style={styles.mainIcon} />
        </View>

        <View style={styles.bottomContainer}>
          <Text style={styles.tagline}>Challenge your mind.</Text>
          <Text style={styles.subTagline}>Play classic Sudoku puzzles and track your progress.</Text>

          {/* Primary: Play Now Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={loginAsGuest}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={24} color="#000" style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Play Now</Text>
          </TouchableOpacity>

          {/* Google Sign-in */}
          <TouchableOpacity
            style={styles.googleSignInButton}
            onPress={signInWithGoogle}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.googleSignInText}>Continue with Google</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'sans-serif',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#e94560',
    marginTop: -5,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  illustrationContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
    width: width,
  },
  bgIcon: {
    position: 'absolute',
    transform: [{ rotate: '15deg' }],
  },
  mainIcon: {
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomContainer: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  tagline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTagline: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  card: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    backdropFilter: 'blur(10px)', // Works on Web, ignored on native
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  userEmail: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    marginTop: 5,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  logoutButtonText: {
    color: '#e94560',
    fontWeight: '600',
  },
  menuContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 15,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  buttonIcon: {
    marginRight: 10,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  guestButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  guestButtonText: {
    fontSize: 16,
    color: '#a0a0a0',
    textDecorationLine: 'underline',
  },
  googleSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  googleSignInText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});
