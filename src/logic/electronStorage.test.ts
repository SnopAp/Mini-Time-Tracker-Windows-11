import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ElectronStorageManager,
  resolveDataFilePath,
} from './electronStorage.ts';
import { createDefaultData } from './tracker.ts';

test('resolveDataFilePath handles custom path and %LOCALAPPDATA% logic', () => {
  const custom = resolveDataFilePath('./test-data.json');
  assert.ok(custom.endsWith('test-data.json'));

  const resolved = resolveDataFilePath();
  assert.ok(resolved.endsWith('data.json'));
});

test('ElectronStorageManager saves and loads data atomically', async () => {
  const tmpDir = path.join(os.tmpdir(), `test-minitime-${Date.now()}`);
  const targetFile = path.join(tmpDir, 'data.json');

  try {
    const storage = new ElectronStorageManager({ customFilePath: targetFile });
    assert.equal(fs.existsSync(targetFile), false);

    // Initial load creates default file
    const loaded = storage.load();
    assert.equal(loaded.schemaVersion, 1);
    assert.equal(loaded.activities[0].name, 'Работа');
    assert.equal(fs.existsSync(targetFile), true);

    // Save customized data
    const modified = createDefaultData();
    modified.activities.push({
      id: 'act-coding',
      name: 'Кодинг Electron',
      color: '#8b5cf6',
      createdAt: new Date().toISOString(),
    });

    await storage.save(modified);

    const reloaded = storage.load();
    assert.equal(reloaded.activities.length, 2);
    assert.equal(reloaded.activities[1].name, 'Кодинг Electron');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('ElectronStorageManager safely backs up corrupt data without silent loss', () => {
  const tmpDir = path.join(os.tmpdir(), `test-minitime-corrupt-${Date.now()}`);
  const targetFile = path.join(tmpDir, 'data.json');

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    const corruptPayload = '{"schemaVersion": 1, "activities": [ broken JSON payload';
    fs.writeFileSync(targetFile, corruptPayload, 'utf-8');

    const storage = new ElectronStorageManager({ customFilePath: targetFile });
    const recovered = storage.load();

    // Default configuration restored safely
    assert.equal(recovered.schemaVersion, 1);
    assert.equal(recovered.activities[0].name, 'Работа');

    // Backup file was created
    assert.ok(storage.lastCorruptBackupPath !== null);
    assert.ok(fs.existsSync(storage.lastCorruptBackupPath!));

    const backupContent = fs.readFileSync(storage.lastCorruptBackupPath!, 'utf-8');
    assert.equal(backupContent, corruptPayload);
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});
