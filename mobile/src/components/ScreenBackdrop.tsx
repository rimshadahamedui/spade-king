import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';

const GAME_BG = require('../../assets/game-bg.png');

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Full-screen game background — assets/game-bg.png */
export function ScreenBackdrop({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <ImageBackground
        source={GAME_BG}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0a0e14',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
});
