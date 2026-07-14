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
import { clearRoomSyncGuards } from '../utils/roomSyncGuards';
import { useIsPortrait } from '../hooks/useIsPortrait';
import {
  inferPublicRoomStatus,
  isPublicRoomJoinable,
  isPublicRoomWatchable,
  publicRoomStatusLabel,
  type PublicRoomStatus,
} from '../utils/publicRoomStatus';

const CARD_WIDTH = 252;
const CARD_HEIGHT = 104;

type PublicRoom = {
  id: string;
  inviteCode: string;
  roomType: number;
  players: number;
  maxPlayers: number;
  phase?: string;
  status: PublicRoomStatus;
};

function RoomCard({
  room,
  disabled,
  onJoin,
  onWatch,
  portrait,
}: {
  room: PublicRoom;
  disabled: boolean;
  onJoin: () => void;
  onWatch: () => void;
  portrait?: boolean;
}) {
  const isFull = room.players >= room.maxPlayers;
  const joinable = isPublicRoomJoinable(room.status) && !isFull;
  const watchable = isPublicRoomWatchable(room.status) && isFull;
  const statusLabel = publicRoomStatusLabel(room.status);
  const cardDisabled = disabled || (!joinable && !watchable);

  return (
    <Pressable
      disabled={cardDisabled}
      onPress={watchable ? onWatch : onJoin}
      style={({ pressed }) => [
        styles.roomCard,
        portrait && styles.roomCardPortrait,
        !joinable && !watchable && styles.roomCardLocked,
        isFull && joinable && styles.roomCardFull,
        pressed && (joinable || watchable) && styles.roomCardPressed,
      ]}
    >
      <View style={styles.roomCodeRow}>
        <Text style={styles.roomCodeLabel}>Room</Text>
        <View
          style={[
            styles.statusPill,
            room.status === 'playing' && styles.statusPillPlaying,
            room.status === 'starting' && styles.statusPillStarting,
          ]}
        >
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.roomCode} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {room.inviteCode}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaCol}>
          <Text style={[styles.seats, isFull && styles.seatsFull]}>
            {room.players}/{room.maxPlayers}
          </Text>
          <Text style={styles.seatsHint}>
            {room.status === 'playing' ? 'in game' : isFull ? 'Full' : 'seats'}
          </Text>
        </View>

        <View style={[styles.joinPill, watchable && styles.watchPill, !joinable && !watchable && styles.joinPillFull]}>
          <Text style={[styles.joinText, watchable && styles.watchText, !joinable && !watchable && styles.joinTextFull]}>
            {joinable ? 'Join' : watchable ? 'Watch' : '—'}
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
  const setSpectatorMode = useGameStore((s) => s.setSpectatorMode);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const isPortrait = useIsPortrait();

  const publicRooms = useQuery({
    queryKey: ['publicRooms', roomType],
    queryFn: async () => {
      const res = await roomApi.listPublic(roomType);
      const rows = res.data.data as Array<Partial<PublicRoom> & Pick<PublicRoom, 'id' | 'inviteCode' | 'roomType' | 'players' | 'maxPlayers'>>;
      return rows.map((room) => ({
        ...room,
        status: room.status ?? inferPublicRoomStatus(room.phase),
      })) as PublicRoom[];
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

  const roomSummary = useMemo(() => {
    const open = rooms.filter((r) => r.status === 'open').length;
    const playing = rooms.filter((r) => r.status === 'playing').length;
    const starting = rooms.filter((r) => r.status === 'starting').length;
    return { open, playing, starting };
  }, [rooms]);

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
      clearRoomSyncGuards();
      setSpectatorMode(false);
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
      clearRoomSyncGuards();
      setSpectatorMode(false);
      setRoom(res.data);
      if (res.data.phase === 'countdown' && res.data.countdownRemaining != null) {
        useGameStore.getState().setCountdown(res.data.countdownRemaining);
      }
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

  const watch = async (inviteCode: string) => {
    setBusy(true);
    try {
      await ensureSocketConnected();
      const res = (await emitAck<{ success: boolean; data: unknown; message?: string }>(
        SOCKET_EVENTS.WATCH_ROOM,
        { inviteCode },
      )) as {
        success: boolean;
        data: Parameters<typeof setRoom>[0] & {
          snapshot?: Parameters<typeof setSnapshot>[0];
        };
        message?: string;
      };
      if (!res.success) throw new Error(res.message ?? 'Could not watch table');
      clearRoomSyncGuards();
      setSpectatorMode(true);
      setRoom(res.data);
      if (res.data.snapshot) setSnapshot(res.data.snapshot);
      navigation.navigate('Game');
    } catch (e) {
      Alert.alert('Watch failed', formatApiError(e));
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
              {roomSummary.open} open
              {roomSummary.starting > 0 ? ` · ${roomSummary.starting} starting` : ''}
              {roomSummary.playing > 0 ? ` · ${roomSummary.playing} playing` : ''}
              {isGuest ? ' · Guests can join open tables only' : ''}
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

          <Text style={styles.sectionLabel}>Tables</Text>

          <View style={[styles.listArea, isPortrait && styles.listAreaPortrait]}>
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
                horizontal={!isPortrait}
                data={rooms}
                keyExtractor={(r) => r.id}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.listContent,
                  isPortrait && styles.listContentPortrait,
                ]}
                renderItem={({ item }) => (
                  <RoomCard
                    room={item}
                    disabled={busy}
                    portrait={isPortrait}
                    onJoin={() => {
                      if (!isPublicRoomJoinable(item.status)) return;
                      void join(item.inviteCode);
                    }}
                    onWatch={() => {
                      if (!isPublicRoomWatchable(item.status)) return;
                      void watch(item.inviteCode);
                    }}
                  />
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
  root: { flex: 1, overflow: 'hidden', justifyContent: 'flex-start' },
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
  listAreaPortrait: {
    flex: 1,
    height: undefined,
    minHeight: 160,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  listContent: {
    paddingVertical: 6,
    gap: 10,
  },
  listContentPortrait: {
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  roomCardPortrait: {
    width: '100%',
    marginRight: 0,
    minHeight: CARD_HEIGHT,
    height: undefined,
  },
  roomCardFull: { opacity: 0.72 },
  roomCardLocked: { opacity: 0.82 },
  roomCardPressed: { borderColor: colors.accentBright },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomCodeLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(45,182,122,0.15)',
    borderWidth: 1,
    borderColor: colors.emeraldBright,
  },
  statusPillStarting: {
    backgroundColor: 'rgba(201,162,39,0.15)',
    borderColor: colors.accentBright,
  },
  statusPillPlaying: {
    backgroundColor: 'rgba(232,93,93,0.12)',
    borderColor: colors.danger,
  },
  statusPillText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  roomCode: {
    width: '100%',
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
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
  watchPill: {
    backgroundColor: 'rgba(91,141,239,0.2)',
    borderColor: '#5B8DEF',
  },
  joinText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  joinTextFull: { color: colors.textDim },
  watchText: { color: colors.cream },
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
