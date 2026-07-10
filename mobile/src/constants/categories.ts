import type { ImageSourcePropType } from 'react-native';

export const CATEGORY_IMAGES: Record<3 | 4 | 5, ImageSourcePropType> = {
  3: require('../../assets/categories/3-player.png'),
  4: require('../../assets/categories/4-player.png'),
  5: require('../../assets/categories/5-player.png'),
};

export const CATEGORY_LABELS: Record<3 | 4 | 5, string> = {
  3: '3-Player',
  4: '4-Player',
  5: '5-Player',
};
