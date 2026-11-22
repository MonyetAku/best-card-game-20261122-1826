// Keyboard and pointer input. Number keys pick a card in the hand, Enter or Space plays the
// picked card, E ends the turn, and a click does the same through the renderer's hit test.
// One-shot presses are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PLAY = 2;
export const ACTION_END = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const END = new Set(['KeyE']);

export function createInput(target, hooks) {
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END;
    } else if (event.code.startsWith('Digit')) {
      const digit = Number.parseInt(event.code.slice(5), 10);
      if (digit >= 1 && digit <= 7 && !event.repeat) hooks.selectCard(digit - 1);
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: nothing here is held, so there is
  // nothing to let go of.
  target.addEventListener('pointerdown', (event) => {
    const point = hooks.toLogical(event.clientX, event.clientY);
    const hit = hooks.hitTest(point.x, point.y);
    if (hit === null) {
      actions |= ACTION_CONFIRM;
      return;
    }
    if (hit.type === 'card') hooks.selectCard(hit.index);
    else if (hit.type === 'play') actions |= ACTION_PLAY;
    else if (hit.type === 'end') actions |= ACTION_END;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
