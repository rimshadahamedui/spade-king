import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const TABLE_TOP = require('../../assets/table-top.png');

interface Props {
  width: number;
  height: number;
  borderRadius?: number;
}

export function TableFeltBackground({ width, height, borderRadius = 18 }: Props) {
  if (width <= 0 || height <= 0) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { width, height, borderRadius, overflow: 'hidden' },
      ]}
      pointerEvents="none"
    >
      <ImageBackground
        source={TABLE_TOP}
        style={styles.image}
        imageStyle={[styles.imageInner, { borderRadius }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  imageInner: {
    width: '100%',
    height: '100%',
  },
});
