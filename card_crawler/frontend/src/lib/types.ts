// ═══════════════════════════════════════════════
// Types matching Move structs
// ═══════════════════════════════════════════════

export interface GameSession {
    id: string;
    state: number;
    player: string;
    playerEntityId: string;

    // Combat
    enemyHp: number;
    enemyMaxHp: number;
    enemyAtk: number;
    enemyBaseAtk: number;
    enemyType: number;
    block: number;
    turnCount: number;

    // Permanent bonuses
    atkBonus: number;
    defBonus: number;
    regenAmount: number;
    thornsAmount: number;
    furyBonus: number;
    rampageCount: number;

    // Status effects
    weakenStacks: number;
    weakenTurns: number;
    poisonStacks: number;

    // Map
    floor: number;
    nodeIndex: number;
    nodesCleared: number;
    nodesTotal: number;

    // Result
    won: boolean;
}

export interface CardData {
    name: string;
    cost: number;
    cardType: number;    // 0=ATK, 1=SKILL, 2=POWER
    effectType: number;
    value: number;
}

export interface PlayerState {
    id: string;
    health: { current: number; max: number };
    energy: { current: number; max: number; regen: number };
    gold: number;
    deck: {
        drawPile: CardData[];
        hand: CardData[];
        discardPile: CardData[];
    };
    relics: { itemType: number; itemValue: number }[];
}
