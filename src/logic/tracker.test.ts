import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  calculateElapsedSeconds,
  createDefaultData,
  TrackerEngine,
  parseAndValidateDataJson,
  EdgeDockStateMachine,
} from './tracker.ts';

test('formatDuration formats seconds correctly into HH:mm:ss', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(5), '00:00:05');
  assert.equal(formatDuration(65), '00:01:05');
  assert.equal(formatDuration(3600), '01:00:00');
  assert.equal(formatDuration(3665), '01:01:05');
  assert.equal(formatDuration(86399), '23:59:59');
  assert.equal(formatDuration(-10), '00:00:00');
});

test('calculateElapsedSeconds computes delta correctly from timestamps', () => {
  const start = new Date('2026-10-17T12:00:00.000Z').toISOString();
  const currentMs = new Date('2026-10-17T12:05:30.000Z').getTime();
  const elapsed = calculateElapsedSeconds(start, currentMs);
  assert.equal(elapsed, 330); // 5 min 30 sec = 330s
});

test('createDefaultData initializes default activity "Работа"', () => {
  const defaultData = createDefaultData();
  assert.equal(defaultData.schemaVersion, 1);
  assert.equal(defaultData.activities.length, 1);
  assert.equal(defaultData.activities[0].name, 'Работа');
  assert.equal(defaultData.activeSession, null);
  assert.equal(defaultData.history.length, 0);
});

test('TrackerEngine starts and stops session correctly, preventing concurrent sessions', () => {
  const engine = new TrackerEngine();
  const activities = engine.getActivities();
  const workActivity = activities[0];

  assert.equal(engine.isRunning(), false);

  // Start session
  const startTime = '2026-10-17T10:00:00.000Z';
  engine.startSession(workActivity.id, startTime);

  assert.equal(engine.isRunning(), true);
  assert.equal(engine.getActiveSession()?.activityName, 'Работа');

  // Prevent multiple concurrent sessions
  assert.throws(
    () => {
      engine.startSession(workActivity.id);
    },
    { message: /Сессия уже запущена/ }
  );

  // Stop session
  const stopTime = '2026-10-17T10:25:00.000Z';
  const completed = engine.stopSession(stopTime);

  assert.equal(engine.isRunning(), false);
  assert.equal(completed.activityName, 'Работа');
  assert.equal(completed.durationSeconds, 1500); // 25 min = 1500 sec

  const history = engine.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, completed.id);
});

test('TrackerEngine handles custom activities creation', () => {
  const engine = new TrackerEngine();
  const custom = engine.addActivity('Обучение C#');
  assert.equal(custom.name, 'Обучение C#');
  assert.equal(engine.getActivities().length, 2);

  // Duplicate name check
  assert.throws(
    () => {
      engine.addActivity('обучение c#');
    },
    { message: /уже существует/ }
  );

  // Empty name check
  assert.throws(
    () => {
      engine.addActivity('   ');
    },
    { message: /не может быть пустым/ }
  );
});

test('parseAndValidateDataJson detects corrupted JSON and preserves backup content', () => {
  const corruptJson = '{ "schemaVersion": 1, "activities": [ broken syntax ';
  const result = parseAndValidateDataJson(corruptJson);

  assert.equal(result.isCorrupted, true);
  assert.equal(result.corruptBackupContent, corruptJson);
  assert.ok(result.errorMessage?.includes('Синтаксическая ошибка'));
  assert.equal(result.data.activities[0].name, 'Работа');
});

test('parseAndValidateDataJson parses valid payload successfully', () => {
  const valid = createDefaultData();
  const jsonStr = JSON.stringify(valid);
  const result = parseAndValidateDataJson(jsonStr);

  assert.equal(result.isCorrupted, false);
  assert.equal(result.data.schemaVersion, 1);
  assert.equal(result.data.activities[0].name, 'Работа');
});

test('EdgeDockStateMachine handles opening, closing, and re-entry without flickering', () => {
  const sm = new EdgeDockStateMachine();
  assert.equal(sm.getState(), 'Floating');

  // Enable dock
  sm.onEnableDock();
  assert.equal(sm.getState(), 'DockedHidden');

  // Mouse enters -> starts opening
  sm.onMouseEnter();
  assert.equal(sm.getState(), 'DockedOpening');

  // Intermediate mouse leave during opening animation MUST NOT cancel opening (anti-flicker requirement)
  sm.onMouseLeaveConfirmed(true);
  assert.equal(sm.getState(), 'DockedOpening');

  // Animation completes -> visible
  sm.onAnimationComplete();
  assert.equal(sm.getState(), 'DockedVisible');

  // Mouse leave with cursor still in tolerance rect -> remains visible (anti-flicker!)
  sm.onMouseLeaveConfirmed(false);
  assert.equal(sm.getState(), 'DockedVisible');

  // Mouse leave confirmed truly outside -> starts closing
  sm.onMouseLeaveConfirmed(true);
  assert.equal(sm.getState(), 'DockedClosing');

  // User moves cursor back into peek tab while closing -> immediately reverses to opening without jumping!
  sm.onMouseEnter();
  assert.equal(sm.getState(), 'DockedOpening');

  // Animation completes -> visible
  sm.onAnimationComplete();
  assert.equal(sm.getState(), 'DockedVisible');

  // User drags away from edge -> restores floating
  sm.onDragAway();
  assert.equal(sm.getState(), 'Floating');
});
