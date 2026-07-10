import { describe, expect, it } from 'vitest';
import { RuleEngine, createCard } from '../../src/game';

describe('Only lowest possible spade', () => {
  it('qualifies when player holds exactly the deck-lowest spade and nothing else in spades', () => {
    const allSpades = [
      createCard('S', '6'),
      createCard('S', '7'),
      createCard('S', 'A'),
    ];
    const hand = [createCard('S', '6'), createCard('H', '9'), createCard('D', '8')];
    expect(RuleEngine.hasOnlyLowestPossibleSpade(hand, allSpades)).toBe(true);
  });

  it('does not qualify with two spades', () => {
    const allSpades = [createCard('S', '6'), createCard('S', 'A')];
    const hand = [createCard('S', '6'), createCard('S', 'A')];
    expect(RuleEngine.hasOnlyLowestPossibleSpade(hand, allSpades)).toBe(false);
  });
});
