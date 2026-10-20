// Keyboard input with per-frame edge detection and double-tap tracking.

const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  boost: ['ShiftLeft', 'ShiftRight'],
  drift: ['Space'],
  rollLeft: ['KeyQ'],
  rollRight: ['KeyE'],
  guns: ['KeyJ', 'KeyZ'],
  missile: ['KeyK', 'KeyX'],
  pause: ['Escape', 'KeyP'],
  start: ['Enter'],
  restart: ['KeyR'],
  invert: ['KeyI'],
  bloom: ['KeyB'],
};

const DOUBLE_TAP_WINDOW = 0.22;

const codeToActions = new Map();
for (const [action, codes] of Object.entries(BINDINGS)) {
  for (const code of codes) {
    if (!codeToActions.has(code)) codeToActions.set(code, []);
    codeToActions.get(code).push(action);
  }
}

const held = new Set();
const pressedThisFrame = new Set();
const releasedThisFrame = new Set();
const doubleTapped = new Set();
const lastPress = new Map();

// Track raw codes so multi-bound actions release correctly
const heldCodes = new Set();
window.addEventListener('keydown', (e) => heldCodes.add(e.code), true);
window.addEventListener('keyup', (e) => heldCodes.delete(e.code), true);

function now() {
  return performance.now() / 1000;
}

window.addEventListener('keydown', (e) => {
  const actions = codeToActions.get(e.code);
  if (!actions) return;
  e.preventDefault();
  if (e.repeat) return;
  for (const action of actions) {
    if (held.has(action)) continue;
    held.add(action);
    pressedThisFrame.add(action);
    const t = now();
    if (t - (lastPress.get(action) ?? -1) < DOUBLE_TAP_WINDOW) {
      doubleTapped.add(action);
      lastPress.set(action, -1);
    } else {
      lastPress.set(action, t);
    }
  }
});

window.addEventListener('keyup', (e) => {
  const actions = codeToActions.get(e.code);
  if (!actions) return;
  e.preventDefault();
  for (const action of actions) {
    // Another key bound to the same action may still be held
    const stillHeld = BINDINGS[action].some((c) => c !== e.code && heldCodes.has(c));
    if (!stillHeld && held.delete(action)) releasedThisFrame.add(action);
  }
});

window.addEventListener('blur', () => {
  for (const action of held) releasedThisFrame.add(action);
  held.clear();
  heldCodes.clear();
});

export const input = {
  down: (action) => held.has(action),
  pressed: (action) => pressedThisFrame.has(action),
  released: (action) => releasedThisFrame.has(action),
  doubleTap: (action) => doubleTapped.has(action),
  axis: (neg, pos) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0),
  endFrame() {
    pressedThisFrame.clear();
    releasedThisFrame.clear();
    doubleTapped.clear();
  },
};
