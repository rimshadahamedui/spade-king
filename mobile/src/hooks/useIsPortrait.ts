import { useWindowDimensions } from 'react-native';

/** True when the window is taller than wide (portrait). */
export function useIsPortrait(): boolean {
  const { width, height } = useWindowDimensions();
  return height >= width;
}
