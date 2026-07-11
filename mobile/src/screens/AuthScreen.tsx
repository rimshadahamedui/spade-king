import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
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

function validationMessage(mode: Mode, errors: FieldErrors<FormValues>): string | null {
  if (mode === 'register' || mode === 'login') {
    if (errors.email) return 'Enter a valid email address.';
    if (errors.password) {
      return mode === 'login'
        ? 'Enter your password.'
        : 'Password must be at least 8 characters.';
    }
  }
  if (mode === 'register' && errors.username) {
    return 'Username must be 2–24 characters.';
  }
  if (mode === 'guest' && errors.username) {
    return 'Table name must be 2–24 characters, or leave it blank.';
  }
  return null;
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('guest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, clearErrors } = useForm<FormValues>({
    defaultValues: { email: '', password: '', username: '' },
    shouldUnregister: true,
  });
  const loginEmail = useAuthStore((s) => s.loginEmail);
  const register = useAuthStore((s) => s.register);
  const loginGuest = useAuthStore((s) => s.loginGuest);

  const onValid = async (values: FormValues) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await loginEmail(values.email.trim(), values.password);
      else if (mode === 'register')
        await register(values.email.trim(), values.password, values.username.trim());
      else await loginGuest(values.username.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const onInvalid = (errors: FieldErrors<FormValues>) => {
    setError(validationMessage(mode, errors));
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    clearErrors();
  };

  const pad = {
    paddingTop: Math.max(insets.top, 12),
    paddingBottom: Math.max(insets.bottom, 12),
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16),
  };

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <StatusBar style="light" />
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, pad]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <BrandLogo size="xl" />
            </View>

            <View style={styles.panel}>
              <View style={styles.tabs}>
                {(['guest', 'login', 'register'] as Mode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => switchMode(m)}
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
                      rules={{
                        required: true,
                        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      }}
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          compact
                          label="Email"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          value={value}
                          onChangeText={onChange}
                          placeholder="you@example.com"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="password"
                      rules={
                        mode === 'login'
                          ? { required: true, minLength: 1 }
                          : { required: true, minLength: 8 }
                      }
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          compact
                          label="Password"
                          secureTextEntry
                          textContentType={mode === 'register' ? 'newPassword' : 'password'}
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
                    rules={
                      mode === 'register'
                        ? { required: true, minLength: 2, maxLength: 24 }
                        : mode === 'guest'
                          ? {
                              validate: (value) =>
                                !value?.trim() ||
                                (value.trim().length >= 2 && value.trim().length <= 24) ||
                                '2–24 characters',
                            }
                          : undefined
                    }
                    render={({ field: { onChange, value } }) => (
                      <TextField
                        compact
                        label={mode === 'guest' ? 'Table name' : 'Username'}
                        autoCapitalize="none"
                        autoCorrect={false}
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
                style={styles.submitBtn}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  panel: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radii.lg,
    ...surfaces.panel,
    padding: spacing.lg,
    borderColor: colors.borderStrong,
  },
  tabs: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...surfaces.chip,
    borderRadius: radii.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: 'rgba(201,162,39,0.2)' },
  tabText: {
    color: colors.textDim,
    textTransform: 'capitalize',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  tabTextOn: { color: colors.accentBright },
  fields: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 12,
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    alignSelf: 'stretch',
  },
});
