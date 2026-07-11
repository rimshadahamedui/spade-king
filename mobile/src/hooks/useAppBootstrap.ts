import { useEffect, useState } from 'react';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore } from '../store/authStore';

async function lockPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    /* Expo Go / web may not support lock */
  }
}

async function prepareNativeChrome(): Promise<void> {
  try {
    await SplashScreen.preventAutoHideAsync();
    SplashScreen.setOptions({ fade: false });
  } catch {
    /* Expo Go may not support all splash APIs */
  }

  try {
    await SystemUI.setBackgroundColorAsync('#000000');
  } catch {
    /* optional on web */
  }
}

/**
 * Keeps the native splash visible until portrait lock, fonts, and auth hydrate finish.
 * Returns null while loading (native splash covers the screen).
 */
export function useAppBootstrap(): boolean {
  const [bootstrapped, setBootstrapped] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    void prepareNativeChrome();
    void lockPortrait();
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let cancelled = false;

    void (async () => {
      await lockPortrait();
      await hydrate();

      if (cancelled) return;

      setBootstrapped(true);

      try {
        await SplashScreen.hideAsync();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, fontError, hydrate]);

  return bootstrapped;
}
