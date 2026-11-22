// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 table is
// scaled to fit the window and centred, the margin filled with the backdrop colour. Cards are
// drawn as flat vector faces: a big value, a suit glyph in the suit's colour and shape, and ember
// pips for the cost, so a card reads at thumbnail size.
import { FIELD, FONT, LIFE_START, PALETTE, SUITS } from './config.js';
import { cardName } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const CARD = { width: 110, height: 150, gap: 10 };
const BACK = { width: 84, height: 116, gap: 8 };
const HEARTH = { x: 640, y: 348, radius: 108 };

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** The suit's glyph, drawn in its own shape at (x, y) with radius r, in the given colour. */
function drawGlyph(context, suit, x, y, r, color) {
  context.fillStyle = color;
  context.beginPath();
  if (suit.shape === 'flame') {
    // A pointed, flickering flame: a wide outer flame with a smaller inner flame in a lighter
    // shade, so it reads as fire and never as the wave's droplet.
    context.moveTo(x, y - r);
    context.quadraticCurveTo(x + r * 0.95, y - r * 0.1, x + r * 0.55, y + r * 0.5);
    context.quadraticCurveTo(x + r * 0.25, y + r * 0.9, x, y + r * 0.75);
    context.quadraticCurveTo(x - r * 0.25, y + r * 0.9, x - r * 0.55, y + r * 0.5);
    context.quadraticCurveTo(x - r * 0.95, y - r * 0.1, x, y - r);
  } else if (suit.shape === 'leaf') {
    // A pointed leaf: two curves meeting at a tip top and bottom, with a centre vein.
    context.moveTo(x, y - r);
    context.quadraticCurveTo(x + r * 0.95, y - r * 0.1, x, y + r);
    context.quadraticCurveTo(x - r * 0.95, y - r * 0.1, x, y - r);
  } else if (suit.shape === 'wave') {
    context.moveTo(x, y - r);
    context.quadraticCurveTo(x + r * 0.85, y + r * 0.1, x + r * 0.5, y + r * 0.55);
    context.quadraticCurveTo(x + r * 0.2, y + r * 0.9, x, y + r * 0.9);
    context.quadraticCurveTo(x - r * 0.2, y + r * 0.9, x - r * 0.5, y + r * 0.55);
    context.quadraticCurveTo(x - r * 0.85, y + r * 0.1, x, y - r);
  } else {
    context.moveTo(x, y - r);
    context.lineTo(x + r * 0.8, y);
    context.lineTo(x, y + r);
    context.lineTo(x - r * 0.8, y);
  }
  context.fill();
  if (suit.shape === 'flame') {
    // The inner flame, in a lighter shade, so the glyph reads as fire at a glance.
    context.fillStyle = '#ffc46b';
    context.beginPath();
    context.moveTo(x, y - r * 0.45);
    context.quadraticCurveTo(x + r * 0.5, y, x + r * 0.28, y + r * 0.45);
    context.quadraticCurveTo(x, y + r * 0.65, x - r * 0.28, y + r * 0.45);
    context.quadraticCurveTo(x - r * 0.5, y, x, y - r * 0.45);
    context.fill();
  } else if (suit.shape === 'leaf') {
    context.strokeStyle = '#f7f1e3';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y - r * 0.85);
    context.lineTo(x, y + r * 0.85);
    context.stroke();
  }
}

/** Where every clickable thing is, from the state: the player's hand, the two buttons. */
export function computeLayout(state) {
  const hand = state.playerHand;
  const total = hand.length * CARD.width + (hand.length - 1) * CARD.gap;
  let x = (FIELD.width - total) / 2;
  const cards = hand.map((card, index) => {
    const rect = { x, y: 545, width: CARD.width, height: CARD.height, index };
    x += CARD.width + CARD.gap;
    return rect;
  });
  const rivalTotal = state.aiHand.length * BACK.width + (state.aiHand.length - 1) * BACK.gap;
  let rx = (FIELD.width - rivalTotal) / 2;
  const rival = state.aiHand.map(() => {
    const rect = { x: rx, y: 78, width: BACK.width, height: BACK.height };
    rx += BACK.width + BACK.gap;
    return rect;
  });
  return {
    cards,
    rival,
    play: { x: 1004, y: 636, width: 118, height: 48 },
    end: { x: 1134, y: 636, width: 122, height: 48 },
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function plainText(value, x, y, size, color, align, baseline) {
    if (!fonts.has(`p${size}`)) fonts.set(`p${size}`, `${size}px ${FONT}`);
    context.font = fonts.get(`p${size}`);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function lifeBar(x, y, width, life, max, color) {
    context.fillStyle = '#101613';
    roundRect(context, x, y, width, 26, 6);
    context.fill();
    const fill = Math.max(0, life / max) * width;
    context.fillStyle = color;
    if (fill > 0) {
      roundRect(context, x, y, fill, 26, 6);
      context.fill();
    }
    context.strokeStyle = '#00000088';
    context.lineWidth = 2;
    roundRect(context, x, y, width, 26, 6);
    context.stroke();
    text(String(life), x + width / 2, y + 20, 18, PALETTE.text, 'center');
  }

  function emberPips(x, y, embers, max) {
    for (let index = 0; index < max; index += 1) {
      context.fillStyle = index < embers ? PALETTE.gold : '#3a3f3a';
      context.beginPath();
      context.arc(x + index * 22 + 9, y + 9, 8, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#00000066';
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function drawCardBack(rect) {
    context.fillStyle = PALETTE.cardBack;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 8);
    context.fill();
    context.strokeStyle = PALETTE.cardBackEdge;
    context.lineWidth = 3;
    roundRect(context, rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 6);
    context.stroke();
    drawGlyph(context, SUITS[0], rect.x + rect.width / 2, rect.y + rect.height / 2, 22, '#f2c94c');
  }

  function drawCardFace(card, rect, selected, affordable) {
    const lift = selected ? -18 : 0;
    const y = rect.y + lift;
    context.fillStyle = '#f7f1e3';
    roundRect(context, rect.x, y, rect.width, rect.height, 10);
    context.fill();
    const suit = SUITS[card.suit];
    context.strokeStyle = selected ? PALETTE.gold : suit.color;
    context.lineWidth = selected ? 6 : 4;
    roundRect(context, rect.x + 3, y + 3, rect.width - 6, rect.height - 6, 8);
    context.stroke();
    text(String(card.value), rect.x + 14, y + 42, 40, suit.dark, 'left');
    drawGlyph(context, suit, rect.x + rect.width / 2, y + 78, 30, suit.color);
    plainText(suit.name, rect.x + rect.width / 2, y + 122, 17, suit.dark, 'center');
    for (let index = 0; index < card.cost; index += 1) {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(rect.x + 18 + index * 18, y + rect.height - 16, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#7a5a10';
      context.lineWidth = 1.5;
      context.stroke();
    }
    text(String(card.value), rect.x + rect.width - 14, y + rect.height - 12, 22, suit.dark, 'right');
    if (!affordable) {
      context.fillStyle = '#10161388';
      roundRect(context, rect.x, y, rect.width, rect.height, 10);
      context.fill();
      plainText('no embers', rect.x + rect.width / 2, y + rect.height / 2, 15, '#ffffff', 'center');
    }
  }

  function drawButton(rect, label, enabled) {
    context.fillStyle = enabled ? PALETTE.button : PALETTE.buttonDisabled;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.fill();
    context.strokeStyle = enabled ? PALETTE.buttonEdge : '#3a434c';
    context.lineWidth = 2;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.stroke();
    text(label, rect.x + rect.width / 2, rect.y + 32, 20, enabled ? PALETTE.text : PALETTE.muted, 'center');
  }

  function drawTable(state) {
    context.fillStyle = PALETTE.feltDark;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.felt;
    context.beginPath();
    context.ellipse(FIELD.width / 2, FIELD.height / 2, 620, 330, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.rimLight;
    context.lineWidth = 10;
    context.beginPath();
    context.ellipse(FIELD.width / 2, FIELD.height / 2, 620, 330, 0, 0, Math.PI * 2);
    context.stroke();
  }

  function drawHearth(state) {
    context.fillStyle = PALETTE.hearth;
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, HEARTH.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.hearthRing;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, HEARTH.radius, 0, Math.PI * 2);
    context.stroke();
    plainText('THE HEARTH', HEARTH.x, HEARTH.y - HEARTH.radius + 26, 15, PALETTE.gold, 'center');
    if (state.hearth !== null) {
      const suit = SUITS[state.hearth.card.suit];
      drawGlyph(context, suit, HEARTH.x, HEARTH.y - 6, 34, suit.color);
      text(cardName(state.hearth.card), HEARTH.x, HEARTH.y + 52, 22, PALETTE.text, 'center');
      plainText(state.hearth.by === 'player' ? 'played by you' : 'played by the rival', HEARTH.x, HEARTH.y + 76, 15, PALETTE.muted, 'center');
    } else {
      plainText('No card yet.', HEARTH.x, HEARTH.y + 10, 18, PALETTE.muted, 'center');
      plainText('Match its suit +2, its value +3.', HEARTH.x, HEARTH.y + 36, 15, PALETTE.muted, 'center');
    }
    if (state.lastPlay !== null && state.lastPlayAge < 1.2) {
      const alpha = 1 - state.lastPlayAge / 1.2;
      context.globalAlpha = alpha;
      const target = state.lastPlay.by === 'player' ? { x: 1120, y: 66 } : { x: 140, y: 626 };
      text(`-${state.lastPlay.damage}`, target.x, target.y, 44, '#ff8a7a', 'center');
      context.globalAlpha = 1;
    }
  }

  function drawLog(state) {
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    for (let index = 0; index < state.log.length; index += 1) {
      plainText(state.log[index], 24, 330 + index * 22, 15, PALETTE.log, 'left');
    }
  }

  function drawHud(state, layout, screen) {
    const inPlay = screen === SCREEN_PLAY;
    plainText('RIVAL BINDER — MIRA OF THE ASHEN HEARTH', 24, 30, 18, PALETTE.text, 'left');
    lifeBar(980, 16, 276, state.aiLife, LIFE_START, '#e5534b');
    plainText(`Deck ${state.deck}`, FIELD.width / 2, 30, 16, PALETTE.muted, 'center');
    for (const rect of layout.rival) drawCardBack(rect);
    plainText('YOU', 24, 636, 18, PALETTE.text, 'left');
    lifeBar(24, 648, 220, state.playerLife, LIFE_START, '#58b368');
    emberPips(24, 684, state.playerEmbers, state.playerMaxEmbers);
    if (inPlay) plainText(state.turn === 'player' ? 'Your turn — play a card, then End Turn.' : 'The rival is thinking…', FIELD.width / 2, 522, 19, state.turn === 'player' ? PALETTE.gold : PALETTE.muted, 'center');
    for (const rect of layout.cards) {
      const card = state.playerHand[rect.index];
      const embers = state.playerEmbers;
      // A card is dimmed only while the game is actually being played: on the title and end
      // screens every card shows at full brightness.
      drawCardFace(card, rect, state.selected === rect.index, !inPlay || !state.played && embers >= card.cost);
    }
    const canPlay = inPlay && state.turn === 'player' && !state.played && state.selected >= 0 && state.selected < state.playerHand.length && state.playerEmbers >= state.playerHand[state.selected].cost;
    drawButton(layout.play, 'Play card', canPlay);
    drawButton(layout.end, 'End turn', inPlay && state.turn === 'player');
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, width, height, 14);
    context.fill();
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(context, x, y, width, height, 14);
    context.stroke();
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      plainText(lines[index], FIELD.width / 2, y + 122 + index * 34, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'A duel of ember cards against Mira, rival binder.',
    'Play one card a turn. Match the hearth’s suit +2, its value +3.',
    'First binder to 0 life loses the pact.',
    'Click a card, or press 1–7, then Enter to play. E ends your turn.',
  ];

  /** Paint one frame: the table, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTable(state);
    const layout = computeLayout(state);
    if (screen === SCREEN_TITLE) {
      drawHearth(state);
      drawHud(state, layout, screen);
      const lines = [...TITLE_LINES];
      if (best > 0) lines.push(`Best pact: won in ${best} turns.`);
      drawPanel('EMBER PACT', lines, 'Press Space or click to strike the pact');
      return;
    }
    drawHearth(state);
    drawLog(state);
    drawHud(state, layout, screen);
    if (screen === SCREEN_OVER) {
      const won = state.winner === 'player';
      drawPanel(
        won ? 'THE PACT IS YOURS' : 'THE PACT IS LOST',
        won
          ? [`Mira’s embers gutter out after ${state.turnCount} turns.`, `You dealt ${state.damageDealt} damage.`]
          : [`Your embers gutter out after ${state.turnCount} turns.`, `You dealt ${state.damageDealt} damage.`],
        'Press Space or click to play again',
        won ? PALETTE.gold : '#e5534b',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a pointer event's client position into logical table coordinates. */
    toLogical(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / view.scale - view.x / view.scale,
        y: (clientY - rect.top) / view.scale - view.y / view.scale,
      };
    },
    /** What sits under a logical point: a card, the Play button, the End button, or nothing. */
    hitTest(state, x, y) {
      const layout = computeLayout(state);
      for (const rect of layout.cards) {
        if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y - 18 && y <= rect.y + rect.height) return { type: 'card', index: rect.index };
      }
      if (x >= layout.play.x && x <= layout.play.x + layout.play.width && y >= layout.play.y && y <= layout.play.y + layout.play.height) return { type: 'play' };
      if (x >= layout.end.x && x <= layout.end.x + layout.end.width && y >= layout.end.y && y <= layout.end.y + layout.end.height) return { type: 'end' };
      return null;
    },
  };
}
