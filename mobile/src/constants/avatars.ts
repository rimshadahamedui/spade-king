import type { ImageSourcePropType } from 'react-native';

export type AvatarId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface PresetAvatar {
  id: AvatarId;
  name: string;
  source: ImageSourcePropType;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 1, name: 'Neon Berserker', source: require('../../assets/avatars/1.png') },
  { id: 2, name: 'Black Tide King', source: require('../../assets/avatars/2.png') },
  { id: 3, name: 'Crimson Ronin', source: require('../../assets/avatars/3.png') },
  { id: 4, name: 'Shadow Fang', source: require('../../assets/avatars/4.png') },
  { id: 5, name: 'The Dark Knight', source: require('../../assets/avatars/5.png') },
  { id: 6, name: 'Gas Reaper', source: require('../../assets/avatars/6.png') },
  { id: 7, name: 'Blaze Fang', source: require('../../assets/avatars/7.png') },
  { id: 8, name: 'Storm Jarl', source: require('../../assets/avatars/8.png') },
];

export function getAvatarSource(avatarId?: number | null): ImageSourcePropType | null {
  if (!avatarId) return null;
  return PRESET_AVATARS.find((a) => a.id === avatarId)?.source ?? null;
}

export function getAvatarName(avatarId?: number | null): string | null {
  if (!avatarId) return null;
  return PRESET_AVATARS.find((a) => a.id === avatarId)?.name ?? null;
}
