import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, radii } from '../theme';

const SEAT_COLORS = [
  '#C9A227',
  '#2DB67A',
  '#5B8DEF',
  '#E85D5D',
  '#B388FF',
];

interface Props {
  username: string;
  seatIndex: number;
  bid?: number | null;
  tricksWon?: number;
  totalScore?: number;
  roundWon?: number | null;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  isCurrentBidder?: boolean;
  isMe?: boolean;
  compact?: boolean;
  showBidding?: boolean;
}

export function PlayerAvatar({
  username,
  seatIndex,
  bid,
  tricksWon,
  totalScore,
  roundWon,
  isDealer,
  isCurrentTurn,
  isCurrentBidder,
  isMe,
  compact,
  showBidding,
}: Props) {
  const accent = SEAT_COLORS[seatIndex % SEAT_COLORS.length];
  const initial = username.charAt(0).toUpperCase();
  const active = isCurrentTurn || isCurrentBidder;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 550 }),
          withTiming(1, { duration: 550 }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [active, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const bidLabel = showBidding
    ? bid !== null && bid !== undefined
      ? String(bid)
      : isCurrentBidder
        ? '…'
        : '—'
    : bid !== null && bid !== undefined
      ? String(bid)
      : '—';

  const showTrickRow = !showBidding && tricksWon !== undefined;
  const showBidRow = showBidding || showTrickRow || (bid !== null && bid !== undefined);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.avatarRow}>
        <View style={styles.avatarCol}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: accent },
              active && styles.ringActive,
              isMe && styles.ringMe,
              active && pulseStyle,
            ]}
          >
            <View style={[styles.circle, compact && styles.circleCompact, { backgroundColor: accent }]}>
              <Text style={[styles.initial, compact && styles.initialCompact]}>{initial}</Text>
            </View>
            {isDealer && (
              <View style={styles.dealerBadge}>
                <Text style={styles.dealerText}>D</Text>
              </View>
            )}
            {active && <View style={styles.turnDot} />}
          </Animated.View>
          {totalScore !== undefined && (
            <Text style={[styles.totalBadge, compact && styles.totalBadgeCompact]}>
              Σ {totalScore}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
            <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
              {username}
            </Text>
            {(showBidRow || showTrickRow) && (
              <View style={[styles.statColumn, active && styles.statColumnActive]}>
                {showBidRow && (
                  <View style={styles.statRow}>
                    <Text style={styles.statKey}>B - </Text>
                    <Text style={styles.statBid}>{bidLabel}</Text>
                  </View>
                )}
                {showTrickRow && (
                  <View style={styles.statRow}>
                    <Text style={styles.statKey}>T - </Text>
                    <Text style={styles.statTrick}>{tricksWon}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
      </View>

      {roundWon !== undefined && roundWon !== null && (
        <Text style={[styles.roundWon, roundWon >= 0 ? styles.wonPos : styles.wonNeg]}>
          {roundWon >= 0 ? `+${roundWon}` : roundWon}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    maxWidth: 120,
  },
  wrapCompact: { maxWidth: 120 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  avatarCol: {
    alignItems: 'center',
    gap: 2,
  },
  infoColumn: {
    justifyContent: 'flex-start',
    gap: 2,
    minWidth: 0,
    flexShrink: 1,
  },
  ring: {
    borderWidth: 2,
    borderRadius: radii.pill,
    padding: 2,
    position: 'relative',
  },
  ringActive: {
    borderColor: colors.accentBright,
    shadowColor: colors.accentBright,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ringMe: { borderWidth: 3 },
  turnDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentBright,
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompact: { width: 34, height: 34, borderRadius: 17 },
  initial: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  initialCompact: { fontSize: 14 },
  dealerBadge: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentBright,
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    lineHeight: 9,
  },
  statColumn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
    minWidth: 44,
  },
  statColumnActive: {
    borderColor: colors.accentBright,
    backgroundColor: 'rgba(201,162,39,0.16)',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statKey: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fonts.bodyMedium,
    lineHeight: 11,
  },
  statBid: {
    color: '#7EC8FF',
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    lineHeight: 11,
  },
  statTrick: {
    color: '#6EE09D',
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    lineHeight: 11,
  },
  name: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textAlign: 'left',
    maxWidth: 72,
  },
  nameCompact: { fontSize: 9, maxWidth: 68 },
  totalBadge: {
    color: colors.accentBright,
    fontSize: 9,
    fontFamily: fonts.bodyBold,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  totalBadgeCompact: {
    fontSize: 8,
    paddingHorizontal: 3,
  },
  roundWon: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    marginTop: 2,
  },
  wonPos: { color: colors.emeraldBright },
  wonNeg: { color: colors.danger },
});
