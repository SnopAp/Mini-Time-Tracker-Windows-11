import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWindowPosition,
  EdgeDockController,
} from './electronDocking.ts';

test('calculateWindowPosition computes docked hidden position with peek tab visible', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
  const floatingPos = { x: 100, y: 200 };

  const hidden = calculateWindowPosition(true, 'hidden', workArea, floatingPos, {
    width: 300,
    height: 80,
    peekTabWidth: 14,
  });

  // 1920 - 14 = 1906
  assert.equal(hidden.x, 1906);
  assert.equal(hidden.y, 200);
});

test('calculateWindowPosition computes docked visible position flush to right edge', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
  const floatingPos = { x: 100, y: 200 };

  const visible = calculateWindowPosition(true, 'visible', workArea, floatingPos, {
    width: 300,
    height: 80,
    peekTabWidth: 14,
  });

  // 1920 - 300 = 1620
  assert.equal(visible.x, 1620);
  assert.equal(visible.y, 200);
});

test('calculateWindowPosition respects taskbar bounds and clamps Y', () => {
  const workArea = { x: 0, y: 40, width: 1920, height: 1000 };
  const floatingPos = { x: 100, y: 1500 }; // way beyond bottom

  const clamped = calculateWindowPosition(false, 'visible', workArea, floatingPos, {
    width: 300,
    height: 80,
    peekTabWidth: 14,
  });

  // maxY = 40 + 1000 - 80 - 10 = 950
  assert.equal(clamped.y, 950);
});

test('EdgeDockController enforces anti-flicker rules during mouse transitions', () => {
  let latestState = '';
  const controller = new EdgeDockController(true, 300, (state) => {
    latestState = state;
  });

  assert.equal(controller.getState(), 'hidden');

  // Mouse enters -> starts opening
  controller.handleMouseEnter();
  assert.equal(controller.getState(), 'opening');
  assert.equal(latestState, 'opening');

  // Mouse leave during opening MUST NOT abort opening
  controller.handleMouseLeave(false);
  assert.equal(controller.getState(), 'opening');

  // Animation completes -> visible
  controller.handleAnimationComplete();
  assert.equal(controller.getState(), 'visible');

  // If dropdown is open, mouse leave is ignored
  controller.handleMouseLeave(true);
  assert.equal(controller.getState(), 'visible');
});
