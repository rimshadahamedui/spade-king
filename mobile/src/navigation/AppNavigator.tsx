import React, { useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../queryClient';
import { useSocketBindings } from '../hooks/useSocketBindings';
import { AuthScreen } from '../screens/AuthScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RoomListScreen } from '../screens/RoomListScreen';
import { RoomScreen } from '../screens/RoomScreen';
import { GameScreen } from '../screens/GameScreen';
import { ScoreboardScreen } from '../screens/ScoreboardScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { PlayerRecordsScreen } from '../screens/PlayerRecordsScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AvatarPickerOverlay } from '../components/AvatarPickerOverlay';
import { useAuthStore } from '../store/authStore';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const updateAvatar = useAuthStore((s) => s.updateAvatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  useSocketBindings();

  const needsAvatar = !!user && !user.avatarId;

  return (
    <>
      <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="RoomList" component={RoomListScreen} />
          <Stack.Screen name="Room">
            {() => (
              <ErrorBoundary label="Lobby">
                <RoomScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Game">
            {() => (
              <ErrorBoundary label="Game">
                <GameScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Scoreboard" component={ScoreboardScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="PlayerRecords" component={PlayerRecordsScreen} />
        </>
      )}
    </Stack.Navigator>

      <AvatarPickerOverlay
        visible={needsAvatar}
        required
        busy={avatarBusy}
        title="Choose your legend"
        subtitle="You need an avatar before joining the tables."
        onSelect={async (avatarId) => {
          setAvatarBusy(true);
          try {
            await updateAvatar(avatarId);
          } finally {
            setAvatarBusy(false);
          }
        }}
      />
    </>
  );
}

export function AppNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
