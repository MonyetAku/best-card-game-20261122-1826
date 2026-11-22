// The rival binder's mind: readable, counterable, never random for its own sake. It looks at
// the cards it can afford and takes the one that deals the most damage right now, breaking ties
// toward the cheaper card so it keeps embers for later turns. When nothing is affordable it
// passes. A value match is worth more than its bonus alone, because it also draws a card.
import { chainFor } from './cards.js';

/** Choose an index into the rival's hand, or -1 to pass. */
export function chooseCard(state) {
  const hand = state.aiHand;
  const embers = state.aiEmbers;
  let bestIndex = -1;
  let bestScore = -1;
  for (let index = 0; index < hand.length; index += 1) {
    const card = hand[index];
    if (card.cost > embers) continue;
    const chain = chainFor(card, state.hearth);
    // Damage now, plus a little for the extra card a value chain draws, minus a little for
    // the embers spent, so a cheap killing blow beats an expensive showy one.
    const score = card.value + chain.bonus + (chain.draw ? 2 : 0) - card.cost * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}
