import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom dark theme to prevent white flashes
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1a1a2e',
    card: '#1a1a2e',
    border: '#1a1a2e',
  },
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <AuthProvider>
        <ThemeProvider value={CustomDarkTheme}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#1a1a2e' },
              animation: 'none',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="difficulty" options={{ headerShown: false }} />
            <Stack.Screen name="game" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </View>
  );
}
