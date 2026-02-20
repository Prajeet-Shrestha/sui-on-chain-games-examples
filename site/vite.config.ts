import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Read collected game data to build slug → dirName mapping
const gamesPath = path.resolve(__dirname, 'src/data/games.json');
let games: { slug: string; dirName: string; hasFrontend: boolean }[] = [];
if (fs.existsSync(gamesPath)) {
    games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
}

export default defineConfig({
    server: {
        headers: {
            // Required for Enoki's popup-based OAuth flow.
            // The SDK polls popup.closed and popup.location.hash to detect
            // when Google OAuth completes. Without this, COOP blocks those
            // cross-origin property accesses and the flow silently fails.
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
    },
    plugins: [
        react(),
        // Serve game dist files at /<slug>/ routes during dev
        {
            name: 'serve-game-dists',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const url = req.url ?? '';
                    for (const game of games) {
                        if (!game.hasFrontend) continue;
                        const prefix = `/${game.slug}/`;
                        if (url === `/${game.slug}` || url.startsWith(prefix)) {
                            // Resolve the file within the game's frontend dist
                            let filePath = url.startsWith(prefix)
                                ? url.slice(prefix.length)
                                : '';
                            if (!filePath || filePath === '') filePath = 'index.html';

                            const distDir = path.resolve(
                                __dirname,
                                '..',
                                'examples',
                                game.dirName,
                                'frontend',
                                'dist',
                            );
                            const fullPath = path.join(distDir, filePath);

                            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                                const ext = path.extname(fullPath).toLowerCase();
                                const mimeTypes: Record<string, string> = {
                                    '.html': 'text/html',
                                    '.js': 'application/javascript',
                                    '.css': 'text/css',
                                    '.json': 'application/json',
                                    '.png': 'image/png',
                                    '.jpg': 'image/jpeg',
                                    '.jpeg': 'image/jpeg',
                                    '.svg': 'image/svg+xml',
                                    '.gif': 'image/gif',
                                    '.ico': 'image/x-icon',
                                    '.woff': 'font/woff',
                                    '.woff2': 'font/woff2',
                                    '.ttf': 'font/ttf',
                                    '.webp': 'image/webp',
                                    '.mp3': 'audio/mpeg',
                                    '.wav': 'audio/wav',
                                    '.ogg': 'audio/ogg',
                                };
                                const contentType = mimeTypes[ext] || 'application/octet-stream';
                                res.setHeader('Content-Type', contentType);
                                fs.createReadStream(fullPath).pipe(res);
                                return;
                            }
                        }
                    }
                    next();
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
