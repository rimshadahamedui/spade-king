import { useCallback, useEffect, useRef, useState } from 'react';
import { isPresetChatMessage } from '../constants/presetChat';
import { useGameStore } from '../store/gameStore';

const BUBBLE_MS = 3200;

export function useTableChatBubbles() {
  const chat = useGameStore((s) => s.chat);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastChatAtRef = useRef(0);
  const bootstrappedRef = useRef(false);

  const clearBubbleTimer = useCallback((userId: string) => {
    const timer = timersRef.current[userId];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[userId];
    }
  }, []);

  const showBubble = useCallback(
    (userId: string, message: string) => {
      if (!isPresetChatMessage(message)) return;

      clearBubbleTimer(userId);
      setBubbles((prev) => ({ ...prev, [userId]: message }));
      timersRef.current[userId] = setTimeout(() => {
        setBubbles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        delete timersRef.current[userId];
      }, BUBBLE_MS);
    },
    [clearBubbleTimer],
  );

  useEffect(() => {
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      lastChatAtRef.current = chat.reduce((max, item) => Math.max(max, item.at), 0);
      return;
    }

    const latest = chat[chat.length - 1];
    if (!latest || latest.at <= lastChatAtRef.current) return;

    lastChatAtRef.current = latest.at;
    showBubble(latest.userId, latest.message);
  }, [chat, showBubble]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    },
    [],
  );

  return { bubbles, showBubble };
}
