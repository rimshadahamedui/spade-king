import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { RoomPlayer } from '../models/types';
import { colors, fonts } from '../theme';

const SEAT_COLORS = ['#C9A227', '#2DB67A', '#5B8DEF', '#E85D5D', '#B388FF'];
const CIRCLE_SIZE = 52;
const SLOT_SIZE = 76;

interface Props {
  maxPlayers: number;
  players: RoomPlayer[];
  myUserId?: string;
  startApprovals?: string[];
  tableFull?: boolean;
}

export function LobbySeatRing({
  maxPlayers,
  players,
  myUserId,
  startApprovals = [],
  tableFull = false,
}: Props) {
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBounds({ width, height });
  };

  const positions = useMemo(() => {
    if (bounds.width < 40 || bounds.height < 40) return [];

    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) * 0.36;

    return Array.from({ length: maxPlayers }, (_, seat) => {
      const angle = -Math.PI / 2 + seat * ((2 * Math.PI) / maxPlayers);
      return {
        seat,
        left: cx + radius * Math.cos(angle) - SLOT_SIZE / 2,
        top: cy + radius * Math.sin(angle) - SLOT_SIZE / 2,
      };
    });
  }, [bounds.width, bounds.height, maxPlayers]);

  const playerBySeat = useMemo(() => {
    const map = new Map<number, RoomPlayer>();
    for (const p of players) map.set(p.seatIndex, p);
    return map;
  }, [players]);

  const approvalSet = useMemo(() => new Set(startApprovals), [startApprovals]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {bounds.width > 0 && (
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerKicker}>{tableFull ? 'Start' : 'Seats'}</Text>
          <Text style={styles.centerCount}>
            {tableFull
              ? `${startApprovals.length}/${maxPlayers}`
              : `${players.length}/${maxPlayers}`}
          </Text>
        </View>
      )}

      {positions.map(({ seat, left, top }) => {
        const player = playerBySeat.get(seat);
        const isMe = player?.userId === myUserId;
        const accent = SEAT_COLORS[seat % SEAT_COLORS.length];
        const initial = player?.username?.charAt(0)?.toUpperCase() || '?';
        const confirmedStart = player ? approvalSet.has(player.userId) : false;

        const statusLabel = !player
          ? 'Empty'
          : tableFull
            ? confirmedStart
              ? 'Ready'
              : 'Waiting'
            : player.isConnected
              ? 'Here'
              : 'Away';

        return (
          <View key={seat} style={[styles.slot, { left, top }]}>
            <View
              style={[
                styles.ring,
                player ? { borderColor: accent } : styles.ringEmpty,
                tableFull && confirmedStart && styles.ringStart,
                isMe && styles.ringMe,
              ]}
            >
              <View
                style={[
                  styles.circle,
                  player ? { backgroundColor: accent } : styles.circleEmpty,
                ]}
              >
                {player ? (
                  <Text style={styles.initial}>{initial}</Text>
                ) : (
                  <Text style={styles.openMark}>+</Text>
                )}
              </View>
              {tableFull && confirmedStart && <View style={styles.startDot} />}
            </View>

            <Text style={styles.name} numberOfLines={1}>
              {player ? (isMe ? 'You' : player.username) : 'Open'}
            </Text>
            <Text
              style={[
                styles.status,
                tableFull && confirmedStart && styles.statusStart,
                player && !tableFull && styles.statusHere,
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 160,
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -22,
    alignItems: 'center',
  },
  centerKicker: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  centerCount: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 22,
    marginTop: 2,
  },
  slot: {
    position: 'absolute',
    width: SLOT_SIZE,
    alignItems: 'center',
  },
  ring: {
    width: CIRCLE_SIZE + 6,
    height: CIRCLE_SIZE + 6,
    borderRadius: (CIRCLE_SIZE + 6) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringEmpty: {
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  ringStart: {
    borderColor: colors.emeraldBright,
  },
  ringMe: {
    borderWidth: 3,
    borderColor: colors.accentBright,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmpty: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  initial: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
  },
  openMark: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 24,
  },
  startDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.emeraldBright,
    borderWidth: 2,
    borderColor: colors.bgDeep,
  },
  name: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    width: SLOT_SIZE,
  },
  status: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
    width: SLOT_SIZE,
  },
  statusStart: { color: colors.emeraldBright },
  statusHere: { color: colors.textMuted },
});
