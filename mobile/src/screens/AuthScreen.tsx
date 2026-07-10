import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { TextField } from '../components/TextField';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

type Mode = 'login' | 'register' | 'guest';

interface FormValues {
  email: string;
  password: string;
  username: string;
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('guest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: '', password: '', username: '' },
  });
  const loginEmail = useAuthStore((s) => s.loginEmail);
  const register = useAuthStore((s) => s.register);
  const loginGuest = useAuthStore((s) => s.loginGuest);

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await loginEmail(values.email, values.password);
      else if (mode === 'register') await register(values.email, values.password, values.username);
      else await loginGuest(values.username || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 14),
    paddingRight: Math.max(insets.right, 14),
  };

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <StatusBar style="light" />
          <View style={[styles.root, pad]}>
            <View style={styles.hero}>
              <BrandLogo size="xl" />
            </View>

            <View style={styles.panel}>
              <View style={styles.tabs}>
                {(['guest', 'login', 'register'] as Mode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={[styles.tab, mode === m && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.fields}>
                {(mode === 'login' || mode === 'register') && (
                  <>
                    <Controller
                      control={control}
                      name="email"
                      rules={{ required: true }}
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          compact
                          label="Email"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          value={value}
                          onChangeText={onChange}
                          placeholder="you@example.com"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="password"
                      rules={{ required: true, minLength: 8 }}
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          compact
                          label="Password"
                          secureTextEntry
                          value={value}
                          onChangeText={onChange}
                          placeholder="••••••••"
                        />
                      )}
                    />
                  </>
                )}

                {(mode === 'register' || mode === 'guest') && (
                  <Controller
                    control={control}
                    name="username"
                    render={({ field: { onChange, value } }) => (
                      <TextField
                        compact
                        label={mode === 'guest' ? 'Table name' : 'Username'}
                        value={value}
                        onChangeText={onChange}
                        placeholder={mode === 'guest' ? 'Optional alias' : 'Choose a name'}
                      />
                    )}
                  />
                )}
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Button
                title={
                  busy
                    ? 'Please wait…'
                    : mode === 'guest'
                      ? 'Enter the lounge'
                      : mode === 'login'
                        ? 'Sign In'
                        : 'Create Account'
                }
                onPress={onSubmit}
                disabled={busy}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    overflow: 'hidden',
  },
  hero: {
    flex: 0.38,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  panel: {
    flex: 0.62,
    borderRadius: radii.lg,
    ...surfaces.panel,
    padding: spacing.md,
    minWidth: 0,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    ...surfaces.chip,
    borderRadius: radii.pill,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: 'rgba(201,162,39,0.2)' },
  tabText: {
    color: colors.textDim,
    textTransform: 'capitalize',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  tabTextOn: { color: colors.accentBright },
  fields: { marginBottom: spacing.xs },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
