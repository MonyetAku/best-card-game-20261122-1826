// Every tuning number and colour in one place. The table is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIFE_START = 40;
export const HAND_START = 5;
export const HAND_MAX = 7;
export const EMBER_MAX = 10;

/** One turn's ember growth: the cap rises by one each turn, and embers refill to the cap. */
export const EMBER_GROWTH = 1;

/** Chain bonus when the played card shares the hearth card's suit. */
export const CHAIN_SUIT_BONUS = 2;
/** Chain bonus when the played card shares the hearth card's value (and draws a card). */
export const CHAIN_VALUE_BONUS = 3;

/** Seconds the rival waits before answering your move, so its play reads as a decision. */
export const AI_THINK_SECONDS = 0.8;

/** The four ember suits. Each has its own colour AND its own shape, so a suit is told apart
 *  by colour and by shape, never by text alone. */
export const SUITS = [
  { key: 'flame', name: 'Flame', color: '#e5534b', dark: '#a8322b', shape: 'flame' },
  { key: 'leaf', name: 'Leaf', color: '#58b368', dark: '#2f7a3e', shape: 'leaf' },
  { key: 'wave', name: 'Wave', color: '#4fc3f7', dark: '#2275a3', shape: 'wave' },
  { key: 'stone', name: 'Stone', color: '#f2c94c', dark: '#a8861f', shape: 'stone' },
];

/** Values run 1 to 9 in every suit. */
export const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A card's ember cost from its value: 1-3 cost one ember, 4-6 cost two, 7-9 cost three. */
export function cardCost(value) {
  return 1 + Math.floor((value - 1) / 3);
}

export const PALETTE = {
  backdrop: '#0e1512',
  felt: '#1d3a2a',
  feltDark: '#16301f',
  rim: '#4a2f1d',
  rimLight: '#6b4426',
  panel: '#20262b',
  panelEdge: '#3a434c',
  text: '#f2ede3',
  muted: '#a8b0a4',
  gold: '#f2c94c',
  cardBack: '#7a2e2e',
  cardBackEdge: '#e5534b',
  hearth: '#2c2118',
  hearthRing: '#f2c94c',
  button: '#2f6b4f',
  buttonEdge: '#58b368',
  buttonDisabled: '#2a3430',
  log: '#cfd6c9',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'ember-pact.best';
