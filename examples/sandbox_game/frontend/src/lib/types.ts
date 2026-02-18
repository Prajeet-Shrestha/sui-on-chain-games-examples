export interface GameSession {
    id: string;
    state: number;
    player: string;
    grid: number[];          // 256 cells (16×16)
    playerX: number;
    playerY: number;
    inventory: number[];     // [dirt, wood, cobble, iron, diamond]
    toolTier: number;        // 0=hand, 1=wood, 2=stone, 3=iron
    toolDurability: number;
    blocksMined: number;
    blocksPlaced: number;
    itemsCrafted: number;
}
