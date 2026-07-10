import type { Card, Suit } from '../models/types';

/** Mirror of backend RuleEngine.getLegalPlays for client-side UI hints. */
export function getLegalPlays(hand: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) return [...hand];
  const following = hand.filter((c) => c.suit === leadSuit);
  if (following.length > 0) return following;
  return [...hand];
}

export function isLegalPlay(hand: Card[], cardId: string, leadSuit: Suit | null): boolean {
  return getLegalPlays(hand, leadSuit).some((c) => c.id === cardId);
}
