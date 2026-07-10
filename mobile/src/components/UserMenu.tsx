import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radii, spacing } from '../theme';

interface ButtonProps {
  onPress: () => void;
}

/** Account icon — opens the in-tree menu overlay. */
export function UserMenuButton({ onPress }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
      accessibilityLabel="Account menu"
      accessibilityRole="button"
    >
      <Ionicons name="person-circle-outline" size={30} color={colors.accentBright} />
    </Pressable>
  );
}

interface OverlayProps {
  visible: boolean;
  onClose: () => void;
}

/** In-tree dropdown (avoids iOS native Modal crashes). Render at screen root. */
export function UserMenuOverlay({ visible, onClose }: OverlayProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const displayName = user?.isGuest
    ? `${user.username}-guest`
    : (user?.username ?? 'Player');

  const handleLogout = () => {
    onClose();
    void logout();
  };

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close account menu"
        accessibilityRole="button"
      />
      <View
        style={[
          styles.menu,
          {
            top: Math.max(insets.top, 20) + 44,
            right: Math.max(insets.right, 16),
          },
        ]}
      >
        <Text style={styles.menuName} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.divider} />
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.cream} />
          <Text style={styles.menuItemText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnPressed: { opacity: 0.8 },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20000,
    elevation: 20000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menu: {
    position: 'absolute',
    minWidth: 176,
    backgroundColor: 'rgba(12, 12, 12, 0.96)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuName: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  menuItemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  menuItemText: {
    color: colors.cream,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
