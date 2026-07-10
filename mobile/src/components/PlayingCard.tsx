import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { Card as CardModel } from '../models/types';
import {
  CARD_COMPACT_HEIGHT,
  CARD_COMPACT_WIDTH,
  CARD_HEIGHT,
  CARD_TABLE_HEIGHT,
  CARD_TABLE_WIDTH,
  CARD_WIDTH,
  getCardImage,
} from '../constants/cardArt';
import { colors } from '../theme';

const CARD_RADIUS = 3;

interface Props {
  card: CardModel;
  selected?: boolean;
  disabled?: boolean;
  illegal?: boolean;
  onPress?: () => void;
  onPlay?: () => void;
  dealIndex?: number;
  compact?: boolean;
  table?: boolean;
}

export function PlayingCard({
  card,
  selected,
  disabled,
  illegal,
  onPress,
  onPlay,
  compact,
  table,
}: Props) {
  const CardSvg = getCardImage(card);
  const width = table ? CARD_TABLE_WIDTH : compact ? CARD_COMPACT_WIDTH : CARD_WIDTH;
  const height = table ? CARD_TABLE_HEIGHT : compact ? CARD_COMPACT_HEIGHT : CARD_HEIGHT;
  const untappable = disabled || illegal;

  const pan = Gesture.Pan()
    .enabled(!untappable && !!onPlay)
    // Let taps reach Pressable on iOS; only claim upward swipes.
    .activeOffsetY(-28)
    .failOffsetX([-24, 24])
    .onEnd((e) => {
      if (e.translationY < -36 && onPlay) {
        runOnJS(onPlay)();
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[table ? styles.tableWrap : compact ? styles.compactWrap : styles.wrap, selected && styles.selectedLift]}>
        <Pressable
          disabled={untappable}
          onPress={onPress}
          style={[
            styles.card,
            { width, height, borderRadius: CARD_RADIUS },
            selected && styles.selected,
          ]}
        >
          <CardSvg width={width} height={height} />
          {illegal && <View style={[styles.illegalTint, { borderRadius: CARD_RADIUS }]} />}
        </Pressable>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 4 },
  compactWrap: { marginHorizontal: 3 },
  tableWrap: { marginHorizontal: 2 },
  card: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  illegalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.accentBright,
    shadowColor: colors.accentBright,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedLift: {
    transform: [{ translateY: -22 }],
  },
});
