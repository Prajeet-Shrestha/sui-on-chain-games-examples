// collect-games.mjs
// Reads all examples/*/example.json manifests and writes
// a consolidated src/data/games.json for the React app.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(__dirname, '../../examples');
const outFile = path.resolve(__dirname, '../src/data/games.json');

const dirs = fs.readdirSync(examplesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const games = [];

for (const dir of dirs) {
  const manifestPath = path.join(examplesDir, dir, 'example.json');
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const hasCover = fs.existsSync(path.join(examplesDir, dir, 'cover.png'));

  games.push({
    dirName: dir,
    name: manifest.name,
    slug: manifest.slug,
    tags: manifest.tags,
    description: manifest.description,
    hasFrontend: manifest.hasFrontend ?? false,
    cover: hasCover ? `/examples/${dir}/cover.png` : null,
  });
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(games, null, 2));
console.log(`✅ Collected ${games.length} game(s) → src/data/games.json`);
