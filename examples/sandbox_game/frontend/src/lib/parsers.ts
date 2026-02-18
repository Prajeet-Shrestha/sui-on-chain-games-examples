import type { GameSession } from './types';

export function parseGameSession(fields: Record<string, any>): GameSession {
    // grid comes as a vector<u8> — either raw array or base64
    let grid: number[] = [];
    const rawGrid = fields.grid;
    if (Array.isArray(rawGrid)) {
        grid = rawGrid.map(Number);
    } else if (typeof rawGrid === 'string') {
        const bytes = Uint8Array.from(atob(rawGrid), c => c.charCodeAt(0));
        grid = Array.from(bytes);
    }

    // inventory comes similarly
    let inventory: number[] = [];
    const rawInv = fields.inventory;
    if (Array.isArray(rawInv)) {
        inventory = rawInv.map((v: any) => Number(v));
    }

    return {
        id: fields.id?.id ?? '',
        state: Number(fields.state),
        player: String(fields.player),
        grid,
        playerX: Number(fields.player_x),
        playerY: Number(fields.player_y),
        inventory,
        toolTier: Number(fields.tool_tier),
        toolDurability: Number(fields.tool_durability),
        blocksMined: Number(fields.blocks_mined),
        blocksPlaced: Number(fields.blocks_placed),
        itemsCrafted: Number(fields.items_crafted),
    };
}
