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

async function lockLandscape(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
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
 * Keeps the native splash visible until landscape lock, fonts, and auth hydrate finish.
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
    void lockLandscape();
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let cancelled = false;

    void (async () => {
      await lockLandscape();
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
