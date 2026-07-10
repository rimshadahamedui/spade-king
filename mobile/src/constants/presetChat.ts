export const PRESET_CHAT_OPTIONS = [
  'Elakir',
  'Sattapadi',
  'Case Paaram',
  'Thadha',
  'ShShot',
  'Mottu Adi',
  '**KKA',
  'Aeyyooo',
  'Gehilla',
  'takkendu podu',
  'Late Late',
  'Welappaal',
] as const;

export type PresetChatOption = (typeof PRESET_CHAT_OPTIONS)[number];

const PRESET_SET = new Set<string>(PRESET_CHAT_OPTIONS);

export function isPresetChatMessage(message: string): boolean {
  return PRESET_SET.has(message.trim());
}
