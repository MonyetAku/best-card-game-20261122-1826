// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules forward
// from a fresh world with a fixed seed, steered by the same choice the rival uses, so the frame
// is what a short game really looks like and the same seed always gives the same frame. The win
// and loss scenes then rig the last exchange through the real playCard call: the rival is left
// on 4 life and the player holds a Flame 8, or the reverse.
import { STEP } from './config.js';
import { chooseCard } from './ai.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { EVENT_OVER } from './world.js';

const PLAY_TURNS = 3;
const MAX_ATTEMPTS = 8;

/** Play one full round (player then rival) with both sides choosing their best card. */
function playRound(world) {
  const state = world.state;
  if (state.phase !== 'play') return;
  const playerIndex = chooseCard({ aiHand: state.playerHand, aiEmbers: state.playerEmbers, hearth: state.hearth });
  if (playerIndex >= 0) world.playCard('player', playerIndex);
  if (state.phase !== 'play') return;
  world.endTurn();
  for (let index = 0; index < 3 / STEP; index += 1) {
    if (world.step(STEP, chooseCard) & EVENT_OVER) break;
    if (state.turn === 'player') break;
  }
}

/** Find a card of the given value in a hand, or -1. */
function findValue(hand, value) {
  for (let index = 0; index < hand.length; index += 1) {
    if (hand[index].value === value) return index;
  }
  return -1;
}

/** Play `rounds` full rounds; false when the pact ends before they are done. */
function playRounds(world, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    playRound(world);
    if (world.state.phase !== 'play') return false;
  }
  return true;
}

/**
 * Set `world` to the named scene (title, play, win or loss; any other name is title) and return
 * the screen to draw over it and the best result to show.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    world.reset();
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // Play a few real rounds; if the pact ends early, deal again and retry — a screenshot scene
  // must show a game still in progress, never a finished one wearing the wrong screen.
  let alive = false;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !alive; attempt += 1) {
    world.reset();
    alive = playRounds(world, PLAY_TURNS);
  }
  if (!alive) {
    return { screen: world.state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  const state = world.state;
  if (name === 'play') {
    state.selected = findValue(state.playerHand, 7) >= 0 ? findValue(state.playerHand, 7) : 1;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // Rig the finish through the real play: the rival on 4 life, and a Flame 8 placed in the
    // player's hand with the embers to pay for it. Eight damage ends the pact.
    state.aiLife = 4;
    state.playerLife = 24;
    state.playerEmbers = 10;
    state.playerMaxEmbers = 10;
    state.playerHand[0] = { suit: 0, value: 8, cost: 3, id: 9001 };
    world.playCard('player', 0);
    return { screen: state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: state.turnCount };
  }
  // The mirror: the player on 4 life, and the rival holds a Wave 8 it plays for real.
  state.playerLife = 4;
  state.aiLife = 24;
  state.aiEmbers = 10;
  state.aiMaxEmbers = 10;
  state.aiHand[0] = { suit: 2, value: 8, cost: 3, id: 9002 };
  world.endTurn();
  world.playCard('ai', 0);
  return { screen: state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
}
