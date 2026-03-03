// TypeScript types mirroring BlufferGame on-chain Move struct

export interface BlufferGame {
    id: string;
    state: number;               // 0=LOBBY, 1=ACTIVE, 2=FINISHED
    creator: string;
    players: string[];
    alive: boolean[];
    maxPlayers: number;
    hands: number[][];           // hands[playerIdx] = array of card values (0-3)
    tableCard: number;           // 0=King, 1=Queen, 2=Jack
    round: number;
    pendingState: number;        // 0=NONE, 1=PLAYED
    pendingPlayerIdx: number;
    pendingCount: number;        // how many cards were played (public)
    currentPlayerIdx: number;
    bulletChamber: number;       // last bullet chamber drawn (0-5)
    rouletteTriggers: number[];  // per-player pull position (0-5)
    winner: string | null;
}
