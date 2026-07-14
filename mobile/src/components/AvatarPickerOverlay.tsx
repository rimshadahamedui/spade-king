import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRESET_AVATARS, type AvatarId } from '../constants/avatars';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props {
  visible: boolean;
  required?: boolean;
  busy?: boolean;
  selectedId?: number | null;
  title?: string;
  subtitle?: string;
  onSelect: (avatarId: AvatarId) => void | Promise<void>;
  onClose?: () => void;
}

export function AvatarPickerOverlay({
  visible,
  required = false,
  busy = false,
  selectedId = null,
  title = 'Choose your legend',
  subtitle = 'Pick the avatar that matches your table presence.',
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<AvatarId | null>(null);

  if (!visible) return null;

  const activeId: AvatarId | null = picked ?? (selectedId as AvatarId | null) ?? null;

  const confirm = () => {
    if (activeId == null || busy) return;
    void onSelect(activeId);
  };

  return (
    <View style={styles.root} pointerEvents="auto">
      {!required ? (
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      ) : (
        <View style={styles.backdrop} />
      )}
      <View
        style={[
          styles.card,
          {
            marginTop: Math.max(insets.top, 12),
            marginBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {PRESET_AVATARS.map((avatar) => {
            const selected = activeId === avatar.id;
            return (
              <Pressable
                key={avatar.id}
                disabled={busy}
                onPress={() => setPicked(avatar.id)}
                style={({ pressed }) => [
                  styles.cell,
                  selected && styles.cellSelected,
                  pressed && !busy && styles.cellPressed,
                ]}
              >
                <View style={[styles.imageWrap, selected && styles.imageWrapSelected]}>
                  <Image source={avatar.source} style={styles.image} resizeMode="cover" />
                </View>
                <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={2}>
                  {avatar.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          disabled={activeId == null || busy}
          onPress={confirm}
          style={({ pressed }) => [
            styles.confirmBtn,
            (activeId == null || busy) && styles.confirmBtnDisabled,
            pressed && activeId != null && !busy && styles.confirmBtnPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.confirmText}>
              {activeId != null ? 'Confirm avatar' : 'Select one above'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60000,
    elevation: 60000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: radii.lg,
    ...surfaces.panel,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  cell: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cellSelected: {
    borderColor: colors.accentBright,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  cellPressed: { opacity: 0.9 },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 8,
  },
  imageWrapSelected: {
    borderColor: colors.accentBright,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  nameSelected: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
  },
  confirmBtn: {
    marginTop: spacing.sm,
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnPressed: {
    opacity: 0.9,
  },
  confirmText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
