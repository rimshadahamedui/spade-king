import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarPickerOverlay } from '../components/AvatarPickerOverlay';
import { Button } from '../components/Button';
import { PlayerMiniAvatar } from '../components/PlayerMiniAvatar';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { getAvatarName } from '../constants/avatars';
import type { AvatarId } from '../constants/avatars';
import { alertMessage } from '../utils/confirm';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const updateAvatar = useAuthStore((s) => s.updateAvatar);
  const [username, setUsername] = useState(user?.username ?? '');
  const [busy, setBusy] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const save = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      alertMessage('Invalid name', 'Username must be at least 2 characters.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(trimmed);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      alertMessage('Saved', 'Your display name was updated everywhere.');
      navigation.goBack();
    } catch (e) {
      alertMessage('Could not save', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const saveAvatar = async (avatarId: AvatarId) => {
    setAvatarBusy(true);
    try {
      await updateAvatar(avatarId);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setAvatarPickerOpen(false);
      alertMessage('Saved', 'Your avatar was updated.');
    } catch (e) {
      alertMessage('Could not save', e instanceof Error ? e.message : 'Try again');
    } finally {
      setAvatarBusy(false);
    }
  };

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backChip}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>Profile</Text>
          <Text style={styles.sub}>Change how your name and avatar appear across the game.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Avatar</Text>
            <View style={styles.avatarRow}>
              <PlayerMiniAvatar
                username={user?.username ?? 'Player'}
                avatarId={user?.avatarId}
                size={56}
              />
              <View style={styles.avatarMeta}>
                <Text style={styles.avatarName}>
                  {getAvatarName(user?.avatarId) ?? 'Not chosen'}
                </Text>
                <Pressable onPress={() => setAvatarPickerOpen(true)} style={styles.changeAvatarBtn}>
                  <Text style={styles.changeAvatarText}>Change avatar</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.emailValue}>{user?.email?.trim() || '—'}</Text>
            <Text style={styles.hint}>Email cannot be changed here.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Your table name"
              placeholderTextColor={colors.textDim}
            />
          </View>

          <Button title={busy ? 'Saving…' : 'Save name'} onPress={() => void save()} disabled={busy} />
        </View>
      </SafeAreaView>

      <AvatarPickerOverlay
        visible={avatarPickerOpen}
        selectedId={user?.avatarId}
        busy={avatarBusy}
        title="Change avatar"
        subtitle="Pick a new legend for the table."
        onClose={() => setAvatarPickerOpen(false)}
        onSelect={saveAvatar}
      />
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  topRow: { marginBottom: spacing.md },
  backChip: {
    ...surfaces.chip,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 12 },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.lg },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarMeta: {
    flex: 1,
    gap: 6,
  },
  avatarName: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  changeAvatarBtn: {
    alignSelf: 'flex-start',
    ...surfaces.chip,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeAvatarText: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emailValue: {
    color: colors.cream,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 4,
  },
  input: {
    height: 44,
    borderRadius: radii.sm,
    ...surfaces.input,
    color: colors.text,
    paddingHorizontal: 12,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
