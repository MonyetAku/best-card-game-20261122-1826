// The game's rules and state, with no drawing and no browser in it: the two hands, the shared
// hearth, life and embers, turns, and the win and loss. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import {
  AI_THINK_SECONDS,
  CHAIN_VALUE_BONUS,
  EMBER_GROWTH,
  EMBER_MAX,
  HAND_MAX,
  HAND_START,
  LIFE_START,
  STEP,
} from './config.js';
import { cardName, chainFor, damageFor } from './cards.js';
import { createDeck } from './deck.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

export const EVENT_PLAY = 1;
export const EVENT_DAMAGE = 2;
export const EVENT_TURN = 4;
export const EVENT_OVER = 8;
export const EVENT_CHAIN = 16;

export function createWorld(random) {
  const state = {
    phase: PHASE_TITLE,
    turn: 'player',
    playerLife: LIFE_START,
    aiLife: LIFE_START,
    playerEmbers: 1,
    aiEmbers: 1,
    playerMaxEmbers: 1,
    aiMaxEmbers: 1,
    playerHand: [],
    aiHand: [],
    hearth: null,
    log: [],
    turnCount: 0,
    damageDealt: 0,
    damageTaken: 0,
    winner: null,
    aiTimer: 0,
    /** Index into the player's hand of the selected card, or -1. */
    selected: -1,
    /** The last play, for the renderer's flourish: { by, card, damage, bonus, kind }. */
    lastPlay: null,
    /** Seconds since the last play, so the flourish fades. */
    lastPlayAge: 99,
    /** Whether the side to move has already played its one card this turn. */
    played: false,
  };
  let deck = null;

  function say(message) {
    state.log.push(message);
    if (state.log.length > 4) state.log.shift();
  }

  function beginTurn(side) {
    state.turn = side;
    state.played = false;
    state.turnCount += side === 'player' ? 1 : 0;
    if (side === 'player') {
      state.playerMaxEmbers = Math.min(EMBER_MAX, state.playerMaxEmbers + EMBER_GROWTH);
      state.playerEmbers = state.playerMaxEmbers;
      drawCard(state.playerHand);
      state.selected = -1;
      say(`Your turn — ${state.playerMaxEmbers} embers.`);
    } else {
      state.aiMaxEmbers = Math.min(EMBER_MAX, state.aiMaxEmbers + EMBER_GROWTH);
      state.aiEmbers = state.aiMaxEmbers;
      drawCard(state.aiHand);
      state.aiTimer = AI_THINK_SECONDS;
    }
  }

  function drawCard(hand) {
    if (deck === null || hand.length >= HAND_MAX) return;
    const card = deck.draw();
    if (card !== null) hand.push(card);
  }

  /** Can this side afford this card right now? */
  function canAfford(side, card) {
    return (side === 'player' ? state.playerEmbers : state.aiEmbers) >= card.cost;
  }

  /**
   * Play a card from a side's hand onto the hearth. Returns an EVENT_* bitmask, or 0 when the
   * play is not allowed (wrong turn, bad index, not enough embers).
   */
  function playCard(side, index) {
    if (state.phase !== PHASE_PLAY || state.turn !== side || state.played) return 0;
    const hand = side === 'player' ? state.playerHand : state.aiHand;
    if (index < 0 || index >= hand.length) return 0;
    const card = hand[index];
    if (!canAfford(side, card)) return 0;
    const chain = chainFor(card, state.hearth);
    const damage = card.value + chain.bonus;
    if (side === 'player') {
      state.playerEmbers -= card.cost;
      state.aiLife = Math.max(0, state.aiLife - damage);
      state.damageDealt += damage;
      say(`You: ${cardName(card)} — ${damage} dmg${chain.bonus > 0 ? `, chain +${chain.bonus}` : ''}.`);
    } else {
      state.aiEmbers -= card.cost;
      state.playerLife = Math.max(0, state.playerLife - damage);
      state.damageTaken += damage;
      say(`Rival: ${cardName(card)} — ${damage} dmg${chain.bonus > 0 ? `, chain +${chain.bonus}` : ''}.`);
    }
    hand.splice(index, 1);
    state.hearth = { card, by: side };
    state.played = true;
    state.lastPlay = { by: side, card, damage, bonus: chain.bonus, kind: chain.kind };
    state.lastPlayAge = 0;
    if (chain.draw) drawCard(hand);
    let events = EVENT_PLAY | EVENT_DAMAGE;
    if (chain.bonus > 0) events |= EVENT_CHAIN;
    if (state.aiLife === 0 || state.playerLife === 0) {
      state.phase = PHASE_OVER;
      state.winner = state.aiLife === 0 ? 'player' : 'ai';
      say(state.winner === 'player' ? 'The rival falls. You win!' : 'Your embers gutter out.');
      return events | EVENT_OVER;
    }
    return events;
  }

  /** End the current side's turn and start the other's. */
  function endTurn() {
    if (state.phase !== PHASE_PLAY) return 0;
    beginTurn(state.turn === 'player' ? 'ai' : 'player');
    return EVENT_TURN;
  }

  /** The rival's move, chosen by its own module and handed in as an index (or -1 to pass). */
  function aiMove(choose) {
    if (state.phase !== PHASE_PLAY || state.turn !== 'ai') return 0;
    const index = choose(state);
    if (index < 0) {
      say('Rival passes.');
      return endTurn();
    }
    const events = playCard('ai', index);
    if (state.phase === PHASE_OVER) return events;
    return events | endTurn();
  }

  /** Make sure a hand holds at least one card costing a single ember, so the first turn is
   *  never a forced pass: swap its first card with a cheap one from the pile. */
  function ensureCheapOpener(hand) {
    for (const card of hand) if (card.cost === 1) return;
    for (let index = 0; index < deck.pile.length; index += 1) {
      if (deck.pile[index].cost === 1) {
        const held = hand[0];
        hand[0] = deck.pile[index];
        deck.pile[index] = held;
        return;
      }
    }
  }

  function reset() {
    deck = createDeck(random);
    state.phase = PHASE_PLAY;
    state.turn = 'player';
    state.playerLife = LIFE_START;
    state.aiLife = LIFE_START;
    state.playerEmbers = 1;
    state.aiEmbers = 1;
    state.playerMaxEmbers = 1;
    state.aiMaxEmbers = 1;
    state.playerHand = [];
    state.aiHand = [];
    state.hearth = null;
    state.log = [];
    state.turnCount = 0;
    state.damageDealt = 0;
    state.damageTaken = 0;
    state.winner = null;
    state.aiTimer = 0;
    state.selected = -1;
    state.played = false;
    state.lastPlay = null;
    state.lastPlayAge = 99;
    for (let index = 0; index < HAND_START; index += 1) {
      state.playerHand.push(deck.draw());
      state.aiHand.push(deck.draw());
    }
    ensureCheapOpener(state.playerHand);
    ensureCheapOpener(state.aiHand);
    say('The pact is struck. Play a card!');
  }

  /**
   * Advance one fixed step. The rival thinks on its own clock: when its timer runs out it
   * plays (or passes) and the turn comes back to you.
   */
  function step(dt, chooseAi) {
    state.lastPlayAge += dt;
    if (state.phase !== PHASE_PLAY || state.turn !== 'ai') return 0;
    state.aiTimer -= dt;
    if (state.aiTimer > 0) return 0;
    return aiMove(chooseAi);
  }

  return {
    state,
    reset,
    playCard,
    endTurn,
    canAfford,
    step,
    /** How many cards are left in the draw pile (0 before the first reset). */
    deckRemaining() {
      return deck === null ? 0 : deck.remaining;
    },
    /** Deal a fresh world for a screenshot scene: reset, then let the caller shape it. */
    get hearthCard() {
      return state.hearth === null ? null : state.hearth.card;
    },
  };
}
