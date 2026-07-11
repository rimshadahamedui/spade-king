import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

const SEAT_COLORS = ['#C9A227', '#2DB67A', '#5B8DEF', '#E85D5D', '#B388FF'];

interface Props {
  username: string;
  seatIndex?: number;
  size?: number;
}

export function PlayerMiniAvatar({ username, seatIndex = 0, size = 40 }: Props) {
  const accent = SEAT_COLORS[seatIndex % SEAT_COLORS.length];
  const initial = (username.trim() || 'P').charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accent,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
  },
  initial: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
  },
});
