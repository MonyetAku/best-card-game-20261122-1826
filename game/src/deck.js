// The draw pile: a shuffled deck, a hand that fills from it, and the discard pile the hearth
// keeps. Shuffling is Fisher-Yates on the seeded random, so a seed deals the same game twice.
import { buildDeck } from './cards.js';

export function createDeck(random) {
  const pile = buildDeck();
  for (let index = pile.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = pile[index];
    pile[index] = pile[other];
    pile[other] = held;
  }
  return {
    pile,
    /** How many cards are left to draw. */
    get remaining() {
      return pile.length;
    },
    /** Take the top card, or null when the pile is empty. */
    draw() {
      return pile.length === 0 ? null : pile.pop();
    },
  };
}
