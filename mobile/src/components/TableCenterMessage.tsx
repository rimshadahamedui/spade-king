import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { colors, fonts, radii } from '../theme';

interface Props {
  text: string;
}

export function TableCenterMessage({ text }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        key={text}
        entering={ZoomIn.duration(160).springify().damping(18)}
        exiting={FadeOut.duration(90)}
        style={styles.pill}
      >
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 35,
  },
  pill: {
    maxWidth: '72%',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
});
