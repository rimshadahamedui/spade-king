import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { BRAND_LOGO } from '../constants/branding';

const SIZES = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
} as const;

interface Props {
  size?: keyof typeof SIZES;
  style?: ViewStyle;
}

/** Brand mark only — no title text (splash / auth / lounge). */
export function BrandLogo({ size = 'md', style }: Props) {
  const dim = SIZES[size];

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={BRAND_LOGO}
        style={{ width: dim, height: dim }}
        resizeMode="contain"
      />
    </View>
  );
}

/** Full-screen black splash while fonts load. */
export function SplashLogo({ size = 'lg' as const }: { size?: keyof typeof SIZES }) {
  return (
    <View style={styles.splash}>
      <BrandLogo size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splash: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
