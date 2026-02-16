/**
 * Tile map for the Sokoban tileset.
 * Spritesheet: tileset.png (5×5 grid, 16×16px per tile, 80×80px total)
 */

export const TILE_SIZE = 16; // px in the source spritesheet
export const SHEET_COLS = 5;

/** Tile positions as (row, col) in the 5×5 grid */
export const TILES = {
    WALL_TOP: { row: 0, col: 0 }, // tile 0  — wall (top face)
    WALL: { row: 0, col: 1 }, // tile 1  — wall (default)
    WALL_CORNER: { row: 0, col: 2 }, // tile 2  — left corner wall
    GOAL: { row: 0, col: 3 }, // tile 3  — goal marker
    GROUND: { row: 1, col: 0 }, // tile 5  — ground
    GROUND_ALT: { row: 1, col: 1 }, // tile 6  — ground variation
    WALL_SIDE: { row: 1, col: 2 }, // tile 7  — left-side wall
    WATER: { row: 2, col: 0 }, // tile 10 — water (impassable)
    BOX: { row: 4, col: 0 }, // tile 20 — box
} as const;

export type TileKey = keyof typeof TILES;

/** Get source x/y in the spritesheet for a given tile */
export function getTileSrc(tile: { row: number; col: number }) {
    return {
        sx: tile.col * TILE_SIZE,
        sy: tile.row * TILE_SIZE,
    };
}

/**
 * Determine which wall tile variant to use based on neighbors.
 * wallSet: Set of "x,y" strings for all wall positions.
 */
export function pickWallTile(
    x: number, y: number,
    wallSet: Set<string>,
): { row: number; col: number } {
    const above = wallSet.has(`${x},${y - 1}`);
    const left = wallSet.has(`${x - 1},${y}`);

    // Corner: no wall above AND no wall to the left
    if (!above && !left) return TILES.WALL_CORNER;
    // Top face: no wall above
    if (!above) return TILES.WALL_TOP;
    // Side: no wall to the left
    if (!left) return TILES.WALL_SIDE;
    // Default inner wall
    return TILES.WALL;
}

/**
 * Pick ground tile using a checkerboard pattern for visual variety.
 */
export function pickGroundTile(x: number, y: number) {
    return (x + y) % 2 === 0 ? TILES.GROUND : TILES.GROUND_ALT;
}
