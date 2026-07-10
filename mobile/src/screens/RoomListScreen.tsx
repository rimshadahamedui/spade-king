import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { CATEGORY_LABELS } from '../constants/categories';
import { roomApi } from '../services/api';
import { emitAck, ensureSocketConnected, SOCKET_EVENTS } from '../services/socket';
import { formatApiError } from '../utils/network';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

const CARD_WIDTH = 252;
const CARD_HEIGHT = 104;

type PublicRoom = {
  id: string;
  inviteCode: string;
  roomType: number;
  players: number;
  maxPlayers: number;
};

function RoomCard({
  room,
  disabled,
  onJoin,
}: {
  room: PublicRoom;
  disabled: boolean;
  onJoin: () => void;
}) {
  const isFull = room.players >= room.maxPlayers;

  return (
    <Pressable
      disabled={disabled}
      onPress={onJoin}
      style={({ pressed }) => [
        styles.roomCard,
        isFull && styles.roomCardFull,
        pressed && !isFull && styles.roomCardPressed,
      ]}
    >
      <Text style={styles.roomCodeLabel}>Room</Text>
      <Text style={styles.roomCode} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {room.inviteCode}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaCol}>
          <Text style={[styles.seats, isFull && styles.seatsFull]}>
            {room.players}/{room.maxPlayers}
          </Text>
          <Text style={styles.seatsHint}>{isFull ? 'Full' : 'seats'}</Text>
        </View>

        <View style={[styles.joinPill, isFull && styles.joinPillFull]}>
          <Text style={[styles.joinText, isFull && styles.joinTextFull]}>
            {isFull ? '—' : 'Join'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function RoomListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RoomList'>>();
  const roomType = route.params.roomType;
  const user = useAuthStore((s) => s.user);
  const isGuest = user?.isGuest ?? false;
  const setRoom = useGameStore((s) => s.setRoom);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const publicRooms = useQuery({
    queryKey: ['publicRooms', roomType],
    queryFn: async () => {
      const res = await roomApi.listPublic(roomType);
      return res.data.data as PublicRoom[];
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  const rooms = useMemo(() => {
    const all = publicRooms.data ?? [];
    const q = search.trim().toUpperCase();
    if (!q) return all;
    return all.filter((r) => r.inviteCode.toUpperCase().includes(q));
  }, [publicRooms.data, search]);

  const create = async () => {
    if (isGuest) {
      Alert.alert(
        'Registered players only',
        'Guest accounts can join tables but cannot create rooms. Sign in or register to host.',
      );
      return;
    }
    setBusy(true);
    try {
      await ensureSocketConnected();
      const res = (await emitAck<{ success: boolean; data: unknown }>(SOCKET_EVENTS.CREATE_ROOM, {
        roomType,
        visibility: 'public',
      })) as { success: boolean; data: Parameters<typeof setRoom>[0] };
      if (!res.success) throw new Error('Failed to create room');
      setRoom(res.data);
      navigation.navigate('Room');
    } catch (e) {
      Alert.alert('Create failed', formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const join = async (inviteCode: string) => {
    setBusy(true);
    try {
      await ensureSocketConnected();
      const res = (await emitAck<{ success: boolean; data: unknown; message?: string }>(
        SOCKET_EVENTS.JOIN_ROOM,
        { inviteCode },
      )) as {
        success: boolean;
        data: Parameters<typeof setRoom>[0] & {
          snapshot?: Parameters<typeof setSnapshot>[0];
        };
        message?: string;
      };
      if (!res.success) throw new Error(res.message ?? 'Join failed');
      setRoom(res.data);
      if (res.data.snapshot) setSnapshot(res.data.snapshot);
      const inGame =
        res.data.phase !== 'waiting' &&
        res.data.phase !== 'countdown' &&
        res.data.phase !== 'finished';
      navigation.navigate(inGame ? 'Game' : 'Room');
    } catch (e) {
      Alert.alert('Join failed', formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.navigate('Lobby')} style={styles.backChip}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            {!isGuest && (
              <Button title="+ New Table" onPress={create} disabled={busy} style={styles.newBtn} />
            )}
          </View>

          <View style={styles.heroText}>
            <Text style={styles.title}>{CATEGORY_LABELS[roomType]}</Text>
            <Text style={styles.sub}>
              {rooms.length} open {rooms.length === 1 ? 'table' : 'tables'}
              {isGuest ? ' · Guests can join only' : ''}
            </Text>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by room code…"
              placeholderTextColor={colors.textDim}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.sectionLabel}>Open tables</Text>

          <View style={styles.listArea}>
            {rooms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {search ? 'No matches' : 'No tables yet'}
                </Text>
                <Text style={styles.emptyHint}>
                  {search
                    ? 'Try another code'
                    : isGuest
                      ? 'Wait for a host or sign in to create one'
                      : 'Tap + New Table to host one'}
                </Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={rooms}
                keyExtractor={(r) => r.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <RoomCard room={item} disabled={busy} onJoin={() => join(item.inviteCode)} />
                )}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backChip: {
    ...surfaces.chip,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 12 },
  newBtn: { minWidth: 100, paddingHorizontal: 14 },
  heroText: { marginBottom: spacing.sm },
  title: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 2,
  },
  searchWrap: { marginBottom: spacing.sm },
  searchInput: {
    height: 38,
    borderRadius: radii.sm,
    ...surfaces.input,
    color: colors.text,
    paddingHorizontal: 12,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  listArea: {
    height: CARD_HEIGHT + 12,
    justifyContent: 'center',
    borderRadius: radii.md,
    ...surfaces.panelSoft,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  listContent: {
    paddingVertical: 6,
    gap: 10,
  },
  roomCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.md,
    ...surfaces.panel,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  roomCardFull: { opacity: 0.5 },
  roomCardPressed: { borderColor: colors.accentBright },
  roomCodeLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  roomCode: {
    width: '100%',
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaCol: { alignItems: 'flex-start', minWidth: 40 },
  seats: {
    color: colors.emeraldBright,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  seatsFull: { color: colors.textDim },
  seatsHint: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  joinPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentBright,
  },
  joinPillFull: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: colors.border,
  },
  joinText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  joinTextFull: { color: colors.textDim },
  emptyCard: {
    flex: 1,
    maxWidth: 360,
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  emptyHint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
