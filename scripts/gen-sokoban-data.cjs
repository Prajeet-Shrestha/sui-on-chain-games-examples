#!/usr/bin/env node
/**
 * Generate sokobanProject.ts from the examples/sokoban directory.
 * Usage: node scripts/gen-sokoban-data.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'examples/sokoban');
const OUT = path.join(ROOT, 'site/src/data/sokobanProject.ts');

// Source files to include (skip binaries, node_modules, dist, lock files, build/)
const filePaths = [
  'Move.toml',
  'sources/game.move',
  'sources/game_tests.move',
  'frontend/package.json',
  'frontend/index.html',
  'frontend/vite.config.ts',
  'frontend/tsconfig.json',
  'frontend/tsconfig.app.json',
  'frontend/tsconfig.node.json',
  'frontend/eslint.config.js',
  'frontend/src/main.tsx',
  'frontend/src/App.tsx',
  'frontend/src/index.css',
  'frontend/src/constants.ts',
  'frontend/src/dApp-kit.ts',
  'frontend/src/lib/suiClient.ts',
  'frontend/src/stores/gameStore.ts',
  'frontend/src/hooks/useGameActions.ts',
  'frontend/src/hooks/useGameState.ts',
  'frontend/src/utils/tileMap.ts',
  'frontend/src/components/GameBoard.tsx',
  'frontend/src/components/Header.tsx',
  'frontend/src/components/LevelSelect.tsx',
  'frontend/src/components/MoveControls.tsx',
  'frontend/src/components/SpriteAnimation.tsx',
];

const entries = [];

for (const fp of filePaths) {
  const fullPath = path.join(BASE, fp);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    entries.push({
      path: fp,
      size: Buffer.byteLength(content, 'utf8'),
      content,
    });
  } catch (e) {
    console.warn(`⚠ Skipped: ${fp} — ${e.message}`);
  }
}

let output = '';
output += 'import type { FileEntry } from "./mockProject";\n\n';
output += 'export const SOKOBAN_FILES: FileEntry[] = ';
output += JSON.stringify(entries, null, 2);
output += ';\n';

fs.writeFileSync(OUT, output);
console.log(`✅ Wrote ${entries.length} file entries to ${path.relative(ROOT, OUT)}`);
