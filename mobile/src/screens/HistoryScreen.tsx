import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { ScreenTopBar } from '../components/ScreenTopBar';
import { statsApi } from '../services/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await statsApi.history();
      return res.data.data as Array<{
        _id: string;
        matchId: string;
        roomType: number;
        finalScore: number;
        placement: number;
        won: boolean;
        playedAt: string;
      }>;
    },
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  if (q.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.center, pad]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar
            title="Match History"
            kicker="Archive"
            onBack={() => navigation.navigate('Lobby')}
          />

          <FlatList
            style={styles.flex}
            contentContainerStyle={styles.content}
            data={q.data ?? []}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={<Text style={styles.empty}>No tables played yet.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  navigation.navigate('MatchDetail', { matchId: String(item.matchId) })
                }
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.roomType}P</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.main}>
                    Place #{item.placement}
                    {item.won ? ' · Won' : ''}
                  </Text>
                  <Text style={styles.meta}>{new Date(item.playedAt).toLocaleString()}</Text>
                </View>
                <Text style={[styles.score, item.won && styles.won]}>{item.finalScore}</Text>
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
  empty: { color: colors.textMuted, fontFamily: fonts.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 10,
  },
  rowPressed: {
    opacity: 0.85,
    borderColor: colors.borderStrong,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceInput,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  badgeText: { color: colors.accentBright, fontFamily: fonts.bodyBold },
  main: { color: colors.text, fontFamily: fonts.bodyBold },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12, fontFamily: fonts.body },
  score: { color: colors.text, fontSize: 24, fontFamily: fonts.display },
  won: { color: colors.accentBright },
});
