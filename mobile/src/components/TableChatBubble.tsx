import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, radii } from '../theme';

interface Props {
  message: string;
}

export function TableChatBubble({ message }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 160 });
    scale.value = withTiming(1, { duration: 160 });
    return () => {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.92, { duration: 200 });
    };
  }, [message, opacity, scale]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, anim]} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={styles.tail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    alignItems: 'center',
    maxWidth: 120,
    zIndex: 100,
    elevation: 100,
  },
  bubble: {
    backgroundColor: 'rgba(2, 4, 8, 0.94)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 100,
  },
  text: {
    color: colors.cream,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    textAlign: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.borderStrong,
    marginTop: -1,
  },
});
