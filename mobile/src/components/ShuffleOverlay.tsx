import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import SpadeA from '../../assets/cards/spades/a.svg';
import HeartK from '../../assets/cards/hearts/k.svg';
import DiamondQ from '../../assets/cards/diamonds/q.svg';
import ClubJ from '../../assets/cards/clubs/j.svg';
import Spade10 from '../../assets/cards/spades/10.svg';
import { colors, fonts } from '../theme';

const CARD_W = 46;
const CARD_H = 66;
const SHUFFLE_CARDS = [SpadeA, HeartK, DiamondQ, ClubJ, Spade10];

function ShuffleCard({ CardSvg, index }: { CardSvg: React.ComponentType<{ width?: number; height?: number }>; index: number }) {
  const offset = useSharedValue(index * 4);
  const rotate = useSharedValue(index * 6 - 12);

  useEffect(() => {
    const delay = index * 90;
    const id = setTimeout(() => {
      offset.value = withRepeat(
        withSequence(
          withTiming(index * 18 - 36, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(index * 4, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(index * 14 - 20, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(index * 6 - 12, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(id);
  }, [index, offset, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value },
      { translateY: -index * 2 },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.card, style, { zIndex: index }]}>
      <CardSvg width={CARD_W} height={CARD_H} />
    </Animated.View>
  );
}

export function ShuffleOverlay() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.label}>Shuffling…</Text>
      <View style={styles.deck}>
        {SHUFFLE_CARDS.map((CardSvg, i) => (
          <ShuffleCard key={i} CardSvg={CardSvg} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  label: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  deck: {
    width: CARD_W + 80,
    height: CARD_H + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
