import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { statsApi } from '../services/api';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function HistoryScreen() {
  const q = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await statsApi.history();
      return res.data.data as Array<{
        _id: string;
        roomType: number;
        finalScore: number;
        placement: number;
        won: boolean;
        playedAt: string;
      }>;
    },
  });

  if (q.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.content}
        data={q.data ?? []}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.kicker}>Archive</Text>
            <Text style={styles.title}>Match History</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No tables played yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.roomType}P</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.main}>Place #{item.placement}</Text>
              <Text style={styles.meta}>{new Date(item.playedAt).toLocaleString()}</Text>
            </View>
            <Text style={[styles.score, item.won && styles.won]}>{item.finalScore}</Text>
          </View>
        )}
      />
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingTop: 24, paddingBottom: 40 },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontSize: 32,
    fontFamily: fonts.display,
    marginTop: 4,
  },
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
