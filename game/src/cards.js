// The cards themselves: what a card is, what it costs, and what it does when it is played.
// A card is { suit, value, cost, id }: suit is an index into SUITS, value 1-9, cost from the
// value, id unique in its deck so the renderer can track one card across turns.
import { SUITS, VALUES, cardCost, CHAIN_SUIT_BONUS, CHAIN_VALUE_BONUS } from './config.js';

let nextId = 1;

/** Build one card of a suit and value. */
export function makeCard(suit, value) {
  return { suit, value, cost: cardCost(value), id: nextId };
}

/** The short name a log line and the hearth show: "Flame 7". */
export function cardName(card) {
  return `${SUITS[card.suit].name} ${card.value}`;
}

/**
 * The damage a card deals when it is played onto the hearth, and why. The hearth remembers the
 * last card played there, by either side: sharing its suit adds CHAIN_SUIT_BONUS, sharing its
 * value adds CHAIN_VALUE_BONUS and draws a card. The two bonuses never stack: a card that
 * matches both takes the value bonus only.
 */
export function chainFor(card, hearth) {
  if (hearth === null) return { bonus: 0, kind: 'none', draw: false };
  if (card.value === hearth.card.value) return { bonus: CHAIN_VALUE_BONUS, kind: 'value', draw: true };
  if (card.suit === hearth.card.suit) return { bonus: CHAIN_SUIT_BONUS, kind: 'suit', draw: false };
  return { bonus: 0, kind: 'none', draw: false };
}

/** The full damage, before it lands: the card's value plus any chain bonus. */
export function damageFor(card, hearth) {
  return card.value + chainFor(card, hearth).bonus;
}

/** A whole deck: every suit, every value, one of each. */
export function buildDeck() {
  const deck = [];
  for (let suit = 0; suit < SUITS.length; suit += 1) {
    for (const value of VALUES) {
      nextId += 1;
      deck.push(makeCard(suit, value));
    }
  }
  return deck;
}
