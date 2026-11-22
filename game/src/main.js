// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between three screens: title, play and game over. Your turn is yours to spend: pick a
// card with 1-7 or a click, play it with Enter or the Play button, then end the turn with E.
// The rival answers after a short think, then the turn is yours again.
//
// ?seed=N fixes the deal. ?shot=title|play|win|loss (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CHAIN, EVENT_DAMAGE, EVENT_OVER, EVENT_PLAY, EVENT_TURN } from './world.js';
import { chooseCard } from './ai.js';
import { ACTION_CONFIRM, ACTION_END, ACTION_PLAY, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best result then lasts this visit only.
  }
}

function runShot(name) {
  world.state.deck = world.deckRemaining();
  const scene = stageShot(name, world);
  world.state.deck = world.deckRemaining();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const state = world.state;
  const input = createInput(canvas, {
    selectCard(index) {
      if (state.phase === 'play' && state.turn === 'player' && index < state.playerHand.length) {
        state.selected = state.selected === index ? -1 : index;
        audio.unlock();
      }
    },
    toLogical(clientX, clientY) {
      return renderer.toLogical(clientX, clientY);
    },
    hitTest(x, y) {
      return renderer.hitTest(state, x, y);
    },
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // A dealt table sits behind the title panel, so the title shows the game at a glance.
  world.reset();
  state.deck = world.deckRemaining();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each play.
  function announce(message) {
    status.textContent = message;
  }

  function playSelected() {
    if (state.phase !== 'play' || state.turn !== 'player' || state.selected < 0) return;
    const events = world.playCard('player', state.selected);
    if (events === 0) {
      announce('That card costs more embers than you have.');
      return;
    }
    state.selected = -1;
    audio.playCard();
    if (events & EVENT_CHAIN) audio.chain();
    if (events & EVENT_DAMAGE) audio.damage();
    if (events & EVENT_OVER) endGame();
    else announce(state.log[state.log.length - 1] ?? '');
  }

  function endTurn() {
    if (state.phase !== 'play' || state.turn !== 'player') return;
    world.endTurn();
    audio.turn();
  }

  function startGame() {
    world.reset();
    state.deck = world.deckRemaining();
    screen = SCREEN_PLAY;
    announce('Your turn. Play a card, then end your turn.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (state.winner === 'player' && (best === 0 || state.turnCount < best)) {
      best = state.turnCount;
      saveBest(best);
    }
    if (state.winner === 'player') audio.win();
    else audio.lose();
    announce(state.winner === 'player' ? `You win the pact in ${state.turnCount} turns.` : 'The rival wins the pact.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_PLAY) playSelected();
    else if (actions & ACTION_END) endTurn();
    else if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        audio.unlock();
        startGame();
      } else if (screen === SCREEN_PLAY && state.turn === 'player') {
        playSelected();
      }
    }
  }

  function step() {
    state.deck = world.deckRemaining();
    const events = world.step(STEP, chooseCard);
    if (events & EVENT_PLAY) audio.playCard();
    if (events & EVENT_CHAIN) audio.chain();
    if (events & EVENT_DAMAGE) audio.damage();
    if (events & EVENT_TURN) audio.turn();
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_DAMAGE) announce(state.log[state.log.length - 1] ?? '');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  // Leaving the tab pauses nothing (turns wait for you), but the rival's timer is dropped.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) accumulator = 0;
  });

  announce('Ember Pact. Press Space or click to strike the pact.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
