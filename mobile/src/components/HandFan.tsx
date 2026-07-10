import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayingCard } from './PlayingCard';
import {
  CARD_COMPACT_HEIGHT,
  CARD_COMPACT_WIDTH,
} from '../constants/cardArt';
import type { Card } from '../models/types';

const CARD_W = CARD_COMPACT_WIDTH;
const CARD_H = CARD_COMPACT_HEIGHT;
const MIN_STEP = 18;
const MAX_STEP = 52;

function cardZIndex(selected: boolean, legal: boolean, index: number): number {
  if (selected) return 10000;
  if (legal) return 1000 + index;
  return index;
}

function cardLayerStyle(selected: boolean, legal: boolean, index: number) {
  const zIndex = cardZIndex(selected, legal, index);
  return { zIndex, elevation: zIndex };
}

interface Props {
  cards: Card[];
  orientation?: 'horizontal' | 'vertical';
  containerWidth: number;
  containerHeight?: number;
  selectedId: string | null;
  legalIds: Set<string>;
  disabled: boolean;
  onPress: (cardId: string) => void;
  onPlay: (cardId: string) => void;
}

/** Overlapping fan — fits full hand without scrolling. */
export function HandFan({
  cards,
  orientation = 'horizontal',
  containerWidth,
  containerHeight = 0,
  selectedId,
  legalIds,
  disabled,
  onPress,
  onPlay,
}: Props) {
  const layout = useMemo(() => {
    if (cards.length === 0) return { step: 0, span: 0 };

    if (orientation === 'vertical') {
      const maxSpread = Math.max(0, containerHeight - CARD_H);
      const step =
        cards.length <= 1 ? 0 : Math.min(14, Math.max(7, maxSpread / (cards.length - 1)));
      return { step, span: CARD_H + step * (cards.length - 1) };
    }

    const maxSpread = Math.max(0, containerWidth - CARD_W);
    const step =
      cards.length <= 1
        ? 0
        : Math.min(MAX_STEP, Math.max(MIN_STEP, maxSpread / (cards.length - 1)));
    return { step, span: CARD_W + step * (cards.length - 1) };
  }, [cards.length, containerWidth, containerHeight, orientation]);

  if (orientation === 'vertical') {
    return (
      <View style={[styles.vRoot, { height: containerHeight, width: CARD_W + 8 }]}>
        <View style={[styles.vTrack, { height: layout.span, width: CARD_W + 8 }]}>
          {cards.map((card, i) => {
            const legal = legalIds.has(card.id);
            const selected = selectedId === card.id;
            return (
              <View
                key={card.id}
                style={[
                  styles.vSlot,
                  {
                    bottom: i * layout.step,
                    ...cardLayerStyle(selected, legal, i),
                    transform: [{ translateX: selected ? -8 : 0 }],
                  },
                ]}
              >
                <PlayingCard
                  card={card}
                  dealIndex={i}
                  compact
                  selected={selected}
                  illegal={!legal}
                  disabled={disabled}
                  onPress={() => onPress(card.id)}
                  onPlay={() => onPlay(card.id)}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.hRoot, { width: containerWidth }]}>
      <View style={[styles.hTrack, { width: layout.span, height: CARD_H + 16 }]}>
        {cards.map((card, i) => {
          const legal = legalIds.has(card.id);
          const selected = selectedId === card.id;
          return (
            <View
              key={card.id}
              style={[
                styles.hSlot,
                {
                  left: i * layout.step,
                  ...cardLayerStyle(selected, legal, i),
                  transform: [{ translateY: selected ? -12 : 0 }],
                },
              ]}
            >
              <PlayingCard
                card={card}
                dealIndex={i}
                compact
                selected={selected}
                illegal={!legal}
                disabled={disabled}
                onPress={() => onPress(card.id)}
                onPlay={() => onPlay(card.id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hRoot: {
    height: CARD_H + 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  hTrack: { position: 'relative' },
  hSlot: { position: 'absolute', bottom: 0 },
  vRoot: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  vTrack: { position: 'relative' },
  vSlot: { position: 'absolute', right: 0 },
});
