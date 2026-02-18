// ═══════════════════════════════════════════════
// Procedural Maze Generator — DFS Backtracker
// Generates perfect mazes of any size
// ═══════════════════════════════════════════════

export interface MazeData {
    walls: number[][];
    width: number;
    height: number;
    startX: number;
    startY: number;
    exitX: number;
    exitY: number;
    maxMoves: number;
    viewRadius: number;
}

export interface LevelConfig {
    size: number;
    name: string;
    emoji: string;
    description: string;
    // Multiplier applied to shortest-path length to get maxMoves
    // Lower = harder. 1.0 would mean you must find the perfect path.
    movesMultiplier: number;
    viewRadius: number;
}

export const LEVELS: LevelConfig[] = [
    { size: 17, name: 'The Passage', emoji: '🕯️', description: '17×17 — Quick start', movesMultiplier: 2.5, viewRadius: 8 },
    { size: 21, name: 'Twisted Paths', emoji: '🔦', description: '21×21 — The plot thickens', movesMultiplier: 2.2, viewRadius: 6 },
    { size: 25, name: 'Dead End Alley', emoji: '💀', description: '25×25 — Watch your step', movesMultiplier: 2.0, viewRadius: 5 },
    { size: 31, name: 'The Labyrinth', emoji: '🌀', description: '31×31 — Getting lost?', movesMultiplier: 1.9, viewRadius: 4 },
    { size: 39, name: 'The Abyss', emoji: '🕳️', description: '39×39 — Maximum depth', movesMultiplier: 1.8, viewRadius: 3 },
];

export const LEVEL_NAMES: Record<number, string> = {};
LEVELS.forEach((l, i) => { LEVEL_NAMES[i + 1] = l.name; });

/**
 * Seeded PRNG for deterministic maze generation.
 * Returns the raw integer value (identical to Move contract).
 */
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        return s;
    };
}

/**
 * BFS to find shortest path length from (startX,startY) to (exitX,exitY).
 * Returns number of tile-steps, or -1 if no path (should never happen in a perfect maze).
 */
function bfsShortestPath(
    walls: number[][], width: number, height: number,
    startX: number, startY: number, exitX: number, exitY: number
): number {
    const queue: [number, number, number][] = [[startX, startY, 0]];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    while (queue.length > 0) {
        const [x, y, dist] = queue.shift()!;
        if (x === exitX && y === exitY) return dist;

        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                walls[ny][nx] === 0 && !visited.has(key)) {
                visited.add(key);
                queue.push([nx, ny, dist + 1]);
            }
        }
    }
    return -1; // unreachable
}

export function generateMaze(level: number): MazeData {
    const config = LEVELS[level - 1];
    const size = config.size;

    // Initialize all walls
    const walls: number[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 1)
    );

    const rng = seededRandom(level * 31337 + 42);

    // Carve paths using DFS backtracker
    // Cells are at odd coordinates
    const startCellX = 1;
    const startCellY = 1;
    walls[startCellY][startCellX] = 0;

    const stack: [number, number][] = [[startCellX, startCellY]];
    const visited = new Set<string>();
    visited.add(`${startCellX},${startCellY}`);

    const directions = [
        [0, -2], // up
        [2, 0],  // right
        [0, 2],  // down
        [-2, 0], // left
    ];

    while (stack.length > 0) {
        const [cx, cy] = stack[stack.length - 1];

        // Get unvisited neighbors
        const neighbors: [number, number, number, number][] = [];
        for (const [ddx, ddy] of directions) {
            const nx = cx + ddx;
            const ny = cy + ddy;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && !visited.has(`${nx},${ny}`)) {
                neighbors.push([nx, ny, cx + ddx / 2, cy + ddy / 2]);
            }
        }

        if (neighbors.length === 0) {
            stack.pop();
            continue;
        }

        // Pick random neighbor using integer modulo (matches Move)
        const randVal = rng();
        const idx = randVal % neighbors.length;
        const [nx, ny, wallX, wallY] = neighbors[idx];

        // Carve path
        walls[ny][nx] = 0;
        walls[wallY][wallX] = 0;

        visited.add(`${nx},${ny}`);
        stack.push([nx, ny]);
    }

    // Exit at bottom-right odd cell
    const exitX = size - 2;
    const exitY = size - 2;
    walls[exitY][exitX] = 0;

    // Compute max moves from shortest path × difficulty multiplier
    const shortestPath = bfsShortestPath(walls, size, size, 1, 1, exitX, exitY);
    const maxMoves = Math.ceil(shortestPath * config.movesMultiplier);

    return {
        walls,
        width: size,
        height: size,
        startX: 1,
        startY: 1,
        exitX,
        exitY,
        maxMoves,
        viewRadius: config.viewRadius,
    };
}

// Cache generated mazes so they don't regenerate on re-render
const mazeCache: Record<number, MazeData> = {};

export function getMaze(level: number): MazeData {
    if (!mazeCache[level]) {
        mazeCache[level] = generateMaze(level);
    }
    return mazeCache[level];
}

// MAZES compat layer
export const MAZES: Record<number, MazeData> = new Proxy({} as Record<number, MazeData>, {
    get: (_target, prop) => {
        const level = Number(prop);
        if (isNaN(level) || level < 1 || level > LEVELS.length) return undefined;
        return getMaze(level);
    },
});
