import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { ConfirmOverlay } from './ConfirmOverlay';
import { adminApi, type AdminLiveRoom } from '../services/api';
import { formatApiError } from '../utils/network';
import { alertMessage } from '../utils/confirm';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

const THUMB_SIDE_PAD = 28;

function formatPhase(phase: string): string {
  return phase.replace(/_/g, ' ');
}

function RoomCard({
  room,
  busy,
  onEnd,
}: {
  room: AdminLiveRoom;
  busy: boolean;
  onEnd: () => void;
}) {
  const inGame = room.phase !== 'waiting' && room.phase !== 'countdown' && room.phase !== 'finished';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.roomCode}>{room.inviteCode}</Text>
          <Text style={styles.roomMeta}>
            {room.roomType}P · {room.visibility} · {formatPhase(room.phase)}
          </Text>
        </View>
        <View style={[styles.phasePill, inGame && styles.phasePillLive]}>
          <Text style={styles.phasePillText}>
            {room.players}/{room.maxPlayers}
          </Text>
        </View>
      </View>

      <Text style={styles.players} numberOfLines={2}>
        {room.playerNames.length > 0 ? room.playerNames.join(' · ') : 'No players'}
      </Text>

      <Button
        title="End session"
        variant="danger"
        compact
        disabled={busy}
        onPress={onEnd}
        style={styles.endBtn}
      />
    </View>
  );
}

export function AdminActiveRoomsPanel() {
  const queryClient = useQueryClient();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [confirmRoom, setConfirmRoom] = useState<AdminLiveRoom | null>(null);
  const [busy, setBusy] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ['adminRooms'],
    queryFn: async () => {
      const res = await adminApi.listRooms();
      return res.data.data ?? [];
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['adminRooms'] });
  }, [queryClient]);

  const submitClose = useCallback(async () => {
    if (!confirmRoom) return;
    setBusy(true);
    setClosingId(confirmRoom.id);
    try {
      await adminApi.closeRoom(confirmRoom.id);
      setConfirmRoom(null);
      refresh();
      alertMessage('Session ended', `Room ${confirmRoom.inviteCode} was closed.`);
    } catch (e) {
      alertMessage('Failed', formatApiError(e));
    } finally {
      setBusy(false);
      setClosingId(null);
    }
  }, [confirmRoom, refresh]);

  const rooms = roomsQuery.data ?? [];
  const loading = roomsQuery.isLoading && rooms.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Active tables</Text>
        <Pressable onPress={refresh} style={styles.refreshBtn} hitSlop={8}>
          <Ionicons name="refresh" size={18} color={colors.accentBright} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={rooms.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={roomsQuery.isFetching && !roomsQuery.isLoading}
              onRefresh={refresh}
              tintColor={colors.accentBright}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active tables right now.</Text>
          }
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              busy={busy && closingId === item.id}
              onEnd={() => setConfirmRoom(item)}
            />
          )}
        />
      )}

      <ConfirmOverlay
        visible={!!confirmRoom}
        title="End this session?"
        message={
          confirmRoom
            ? `Close room ${confirmRoom.inviteCode} and send all ${confirmRoom.players} player(s) back to the lobby. In-progress scores will not be saved.`
            : ''
        }
        confirmText="End session"
        cancelText="Cancel"
        destructive
        busy={busy}
        onConfirm={() => void submitClose()}
        onCancel={() => {
          if (busy) return;
          setConfirmRoom(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: THUMB_SIDE_PAD,
  },
  toolbarTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  list: {
    paddingHorizontal: THUMB_SIDE_PAD,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIDE_PAD,
  },
  emptyText: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: radii.md,
    ...surfaces.panel,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  roomCode: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
  },
  roomMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  phasePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  phasePillLive: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(232,93,93,0.12)',
  },
  phasePillText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  players: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  endBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minWidth: 120,
  },
});
