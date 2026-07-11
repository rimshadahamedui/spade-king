import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayerAvatar } from './PlayerAvatar';
import { TableChatBubble } from './TableChatBubble';
import { getOpponentAvatarPosition, TABLE_SEAT_WIDTH } from '../utils/tableSeatGeometry';
import type { GamePlayer } from '../models/types';

interface Bounds {
  width: number;
  height: number;
}

interface Props {
  bounds: Bounds;
  players: GamePlayer[];
  myUserId: string;
  currentTurnSeatIndex: number | null;
  currentBidderSeatIndex: number | null;
  shufflerSeatIndex: number;
  roundScores?: Array<{ userId: string; points: number }>;
  showRoundWon?: boolean;
  phase?: string;
  chatBubbles?: Record<string, string>;
  /** avatars = seats only; bubbles = chat overlay only; full = both (default) */
  mode?: 'full' | 'avatars' | 'bubbles';
}

/**
 * Opponents arc across the top/sides; local player anchored at bottom-center above the hand.
 */
export function GameTableLayout({
  bounds,
  players,
  myUserId,
  currentTurnSeatIndex,
  currentBidderSeatIndex,
  shufflerSeatIndex,
  roundScores,
  showRoundWon,
  phase,
  chatBubbles,
  mode = 'full',
}: Props) {
  const myPlayer = players.find((p) => p.userId === myUserId);
  const mySeat = myPlayer?.seatIndex ?? 0;
  const opponents = players.filter((p) => p.userId !== myUserId);
  const count = opponents.length;

  const opponentPositions = useMemo(() => {
    if (bounds.width < 40 || bounds.height < 40 || count === 0) return [];

    return opponents.map((p) => ({
      player: p,
      ...getOpponentAvatarPosition(bounds, p.seatIndex, mySeat, players.length),
    }));
  }, [opponents, mySeat, players.length, count, bounds.width, bounds.height]);

  const scoreMap = useMemo(
    () => new Map(roundScores?.map((s) => [s.userId, s.points]) ?? []),
    [roundScores],
  );

  const showBidding = phase === 'bidding';
  const showPlayStats = phase === 'playing' || phase === 'scoreboard';
  const showAvatars = mode === 'full' || mode === 'avatars';
  const showBubbles = mode === 'full' || mode === 'bubbles';

  const renderBubble = (player: GamePlayer) => {
    const bubble = chatBubbles?.[player.userId];
    if (!showBubbles || !bubble) return null;
    return <TableChatBubble message={bubble} />;
  };

  const renderAvatar = (player: GamePlayer, isMe: boolean) => {
    if (!showAvatars) return null;
    return (
      <View style={styles.seatStack}>
        {mode === 'full' ? renderBubble(player) : null}
        <PlayerAvatar
          username={player.username}
          seatIndex={player.seatIndex}
          bid={showBidding || showPlayStats ? player.bid : null}
          tricksWon={showPlayStats ? player.tricksWon : undefined}
          totalScore={player.totalScore}
          roundWon={showRoundWon ? (scoreMap.get(player.userId) ?? null) : null}
          isDealer={player.seatIndex === shufflerSeatIndex}
          isMe={isMe}
          isCurrentTurn={currentTurnSeatIndex === player.seatIndex}
          isCurrentBidder={currentBidderSeatIndex === player.seatIndex}
          showBidding={showBidding}
          compact
        />
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {showAvatars &&
        opponentPositions.map(({ player, left, top }) => (
          <View key={player.userId} style={[styles.seat, { left, top }]} pointerEvents="none">
            {renderAvatar(player, false)}
          </View>
        ))}

      {showAvatars && myPlayer && (
        <View style={styles.meSeat} pointerEvents="none">
          {renderAvatar(myPlayer, true)}
        </View>
      )}

      {showBubbles && mode === 'bubbles' && (
        <View style={styles.bubbleLayer} pointerEvents="none">
          {opponentPositions.map(({ player, left, top }) => (
            <View
              key={`bubble-${player.userId}`}
              style={[styles.seat, { left, top }]}
              pointerEvents="none"
            >
              <View style={styles.bubbleAnchor}>{renderBubble(player)}</View>
            </View>
          ))}
          {myPlayer && (
            <View style={styles.meSeat} pointerEvents="none">
              <View style={styles.bubbleAnchor}>{renderBubble(myPlayer)}</View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    position: 'absolute',
    width: TABLE_SEAT_WIDTH,
    alignItems: 'center',
  },
  seatStack: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  bubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
  },
  bubbleAnchor: {
    alignItems: 'center',
    position: 'relative',
    minHeight: 1,
  },
  meSeat: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
