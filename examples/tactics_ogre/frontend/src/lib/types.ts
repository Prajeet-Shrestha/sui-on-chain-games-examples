// ═══ On-chain data types mirroring Move structs ═══

export interface Roster {
    id: string;
    owner: string;
    gold: number;
    units: string[]; // entity IDs
    inBattle: boolean;
}

export interface UnitState {
    id: string;
    name: string;
    class: number;
    element: number;
    team: number;
    hp: { current: number; max: number };
    atk: number;
    def: number;
    range: number;
    speed: number;
    ap: { current: number; max: number; regen: number };
    position: { x: number; y: number };
}

export interface GameSession {
    id: string;
    state: number;
    players: string[];
    maxUnitsPerPlayer: number;
    p1Ready: boolean;
    p2Ready: boolean;
    p1Units: string[];
    p2Units: string[];
    p1AliveCount: number;
    p2AliveCount: number;
    winner: string | null;
    currentTurn: number;
    turnNumber: number;
}

export interface GridCell {
    x: number;
    y: number;
    occupantId: string | null;
}

export interface GridState {
    id: string;
    width: number;
    height: number;
}
