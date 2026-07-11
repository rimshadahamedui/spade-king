import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { UserMenuButton, UserMenuOverlay } from '../components/UserMenu';
import { CATEGORY_IMAGES, CATEGORY_LABELS } from '../constants/categories';
import { useIsPortrait } from '../hooks/useIsPortrait';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, gradients, radii, spacing } from '../theme';

const THUMB_SIDE_PAD = 28;

export function LobbyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const isPortrait = useIsPortrait();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const pad = {
    paddingTop: Math.max(insets.top, 16) + 4,
    paddingBottom: Math.max(insets.bottom, 20) + 6,
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16),
  };

  const thumbLayout = useMemo(() => {
    const horizontalPad = pad.paddingLeft + pad.paddingRight + THUMB_SIDE_PAD * 2;
    const gap = 12;
    const count = 3;
    if (isPortrait) {
      const cardWidth = Math.min(winW - horizontalPad, 360);
      const imageHeight = Math.floor(cardWidth * 0.5);
      return { rowWidth: cardWidth, cardWidth, imageHeight, gap, column: true as const };
    }
    const rowWidth = Math.min(winW - horizontalPad, 680);
    const cardWidth = Math.floor((rowWidth - gap * (count - 1)) / count);
    const imageHeight = Math.floor(cardWidth * 0.48);
    return { rowWidth, cardWidth, imageHeight, gap, column: false as const };
  }, [winW, isPortrait, pad.paddingLeft, pad.paddingRight]);

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerSide} />
              <View style={styles.brandBlock}>
                <BrandLogo size="lg" />
              </View>
              <View style={[styles.headerSide, styles.headerSideRight]}>
                <UserMenuButton onPress={() => setAccountMenuOpen(true)} />
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.main}>
              <Text style={styles.section}>Choose game type</Text>
              <View
                style={[
                  thumbLayout.column ? styles.column : styles.row,
                  { paddingHorizontal: THUMB_SIDE_PAD },
                  !thumbLayout.column && {
                    width: thumbLayout.rowWidth,
                    gap: thumbLayout.gap,
                  },
                ]}
              >
                {([3, 4, 5] as const).map((n) => (
                  <View
                    key={n}
                    style={[
                      styles.modeWrap,
                      { width: thumbLayout.cardWidth },
                      thumbLayout.column && styles.modeWrapColumn,
                    ]}
                  >
                  <Pressable onPress={() => navigation.navigate('RoomList', { roomType: n })}>
                    <LinearGradient colors={[...gradients.gold]} style={styles.goldFrame}>
                      <View style={styles.thumbInner}>
                        <View
                          style={[
                            styles.thumbMedia,
                            { height: thumbLayout.imageHeight },
                          ]}
                        >
                          <Image
                            source={CATEGORY_IMAGES[n]}
                            style={styles.thumb}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.labelBar}>
                          <Text style={styles.modeLabel} numberOfLines={1}>
                            {CATEGORY_LABELS[n]}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
          </ScrollView>

          <View style={styles.footerLinks}>
            <Pressable
              style={styles.footerLink}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <MaterialCommunityIcons name="trophy" size={18} color={colors.accentBright} />
              <Text style={styles.footerText}>Leaderboard</Text>
            </Pressable>
            <Pressable style={styles.footerLink} onPress={() => navigation.navigate('History')}>
              <Ionicons name="albums-outline" size={18} color={colors.accentBright} />
              <Text style={styles.footerText}>Match History</Text>
            </Pressable>
          </View>
        </View>
        <UserMenuOverlay
          visible={accountMenuOpen}
          onClose={() => setAccountMenuOpen(false)}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerSide: {
    width: 42,
    height: 38,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  mainScroll: {
    flex: 1,
    minHeight: 0,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm,
  },
  main: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.xs,
    minHeight: 0,
  },
  brandBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'center',
  },
  column: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modeWrap: {
    flexShrink: 0,
  },
  modeWrapColumn: {
    width: '100%',
    maxWidth: 360,
  },
  goldFrame: {
    width: '100%',
    borderRadius: radii.sm + 2,
    padding: 2,
  },
  thumbInner: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbMedia: {
    width: '100%',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  labelBar: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.88)',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    borderBottomLeftRadius: radii.sm - 1,
    borderBottomRightRadius: radii.sm - 1,
  },
  modeLabel: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  footerLinks: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
