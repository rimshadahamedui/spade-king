import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PlayingCard } from './PlayingCard';
import { seatOffset } from '../utils/tableSeatGeometry';
import type { Card } from '../models/types';

interface Play {
  userId: string;
  card: Card;
  seatIndex: number;
}

interface Bounds {
  width: number;
  height: number;
}

export interface TrickCollectPayload {
  plays: Play[];
  winnerUserId: string;
  visibleCardIds: string[];
}

interface Props {
  plays: Play[];
  mySeat: number;
  playerCount: number;
  bounds: Bounds;
  players: Array<{ userId: string; seatIndex: number }>;
  trickCollect: TrickCollectPayload | null;
  onCollectDone: () => void;
}

const PLAY_MS = 240;
const COLLECT_MS = 480;
const LANDING_SCALE = 0.3;

function AnimatedPlayCard({
  play,
  from,
  landing,
  stackIndex,
  mode,
  collectTarget,
  startAtLanding,
  onCollectDone,
}: {
  play: Play;
  from: { x: number; y: number };
  landing: { x: number; y: number };
  stackIndex: number;
  mode: 'play' | 'collect';
  collectTarget?: { x: number; y: number };
  startAtLanding?: boolean;
  onCollectDone?: () => void;
}) {
  const startX = startAtLanding ? landing.x + stackIndex * 3 : from.x;
  const startY = startAtLanding ? landing.y - stackIndex * 2 : from.y;

  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(mode === 'play' ? 0.88 : 1);

  useEffect(() => {
    if (mode === 'play') {
      tx.value = withTiming(landing.x + stackIndex * 3, {
        duration: PLAY_MS,
        easing: Easing.out(Easing.cubic),
      });
      ty.value = withTiming(landing.y - stackIndex * 2, {
        duration: PLAY_MS,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, { duration: PLAY_MS });
      return;
    }

    if (!collectTarget) return;

    tx.value = withTiming(collectTarget.x, {
      duration: COLLECT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    ty.value = withTiming(collectTarget.y, {
      duration: COLLECT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    opacity.value = withTiming(0, { duration: COLLECT_MS });
    scale.value = withTiming(0.65, { duration: COLLECT_MS });

    const id = setTimeout(() => onCollectDone?.(), COLLECT_MS + 40);
    return () => clearTimeout(id);
  }, [
    mode,
    collectTarget,
    landing.x,
    landing.y,
    stackIndex,
    from.x,
    from.y,
    onCollectDone,
    opacity,
    scale,
    tx,
    ty,
  ]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.cardSlot, style]}>
      <PlayingCard card={play.card} table />
    </Animated.View>
  );
}

function CollectingTrick({
  payload,
  mySeat,
  playerCount,
  bounds,
  players,
  onDone,
}: {
  payload: TrickCollectPayload;
  mySeat: number;
  playerCount: number;
  bounds: Bounds;
  players: Array<{ userId: string; seatIndex: number }>;
  onDone: () => void;
}) {
  const winner = players.find((p) => p.userId === payload.winnerUserId);
  if (!winner) return null;

  const winnerTarget = seatOffset(winner.seatIndex, mySeat, playerCount, bounds, 1);
  const finishedRef = useRef(0);

  const handleOneDone = () => {
    finishedRef.current += 1;
    if (finishedRef.current >= payload.plays.length) {
      onDone();
    }
  };

  return (
    <>
      {payload.plays.map((play, i) => {
        const from = seatOffset(play.seatIndex, mySeat, playerCount, bounds, 1);
        const landing = seatOffset(play.seatIndex, mySeat, playerCount, bounds, LANDING_SCALE);
        const wasVisible = payload.visibleCardIds.includes(play.card.id);

        return (
          <AnimatedPlayCard
            key={`collect-${play.card.id}`}
            play={play}
            from={from}
            landing={landing}
            stackIndex={i}
            mode="collect"
            startAtLanding={wasVisible}
            collectTarget={winnerTarget}
            onCollectDone={handleOneDone}
          />
        );
      })}
    </>
  );
}

export function TrickPile({
  plays,
  mySeat,
  playerCount,
  bounds,
  players,
  trickCollect,
  onCollectDone,
}: Props) {
  const collectingIds = new Set(trickCollect?.plays.map((p) => p.card.id) ?? []);
  const activePlays = plays.filter((p) => !collectingIds.has(p.card.id));
  const showActive = activePlays.length > 0;

  if (!showActive && !trickCollect) {
    return <View style={styles.empty} pointerEvents="none" />;
  }

  return (
    <View style={styles.root} pointerEvents="none">
      {trickCollect && (
        <CollectingTrick
          payload={trickCollect}
          mySeat={mySeat}
          playerCount={playerCount}
          bounds={bounds}
          players={players}
          onDone={onCollectDone}
        />
      )}

      {showActive &&
        activePlays.map((play, i) => {
          const from = seatOffset(play.seatIndex, mySeat, playerCount, bounds, 1);
          const landing = seatOffset(play.seatIndex, mySeat, playerCount, bounds, LANDING_SCALE);
          return (
            <AnimatedPlayCard
              key={play.card.id}
              play={play}
              from={from}
              landing={landing}
              stackIndex={i}
              mode="play"
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...StyleSheet.absoluteFillObject,
  },
  cardSlot: {
    position: 'absolute',
  },
});
