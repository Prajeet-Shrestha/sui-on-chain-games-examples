# 🦠 Virus — On-Chain Flood-It Puzzle

A turn-based puzzle game on the Sui blockchain. You are a virus — spread across the grid by changing your color to match neighboring cells and absorb them. Conquer every cell before you run out of moves.

## Game Overview

**Genre:** Single-player puzzle  
**Engine:** Sui Move (on-chain) + React (frontend)  
**Mechanic:** Flood-fill color matching  

The player controls one or more virus starting points on a colored grid. Each turn, the player picks a new color. All virus-controlled cells change to that color and absorb any adjacent cells that already have that color — spreading the infection outward via BFS flood-fill. The goal is to infect every cell on the board within a limited number of moves.

## How to Play

1. **Connect your wallet** and choose a level
2. Each cell on the board has a color. Your virus starts at one or more positions (marked with ★)
3. Pick a color from the palette — your virus changes to that color
4. All neighboring cells of matching color are **absorbed** into the virus
5. Repeat until the entire board is infected — or you run out of moves

> **Strategy tip:** Look for the color that will absorb the most cells each turn. In later levels, multiple viruses attack from different corners simultaneously — use this pincer to cut through the board efficiently.

## Levels

| # | Name | Grid | Colors | Viruses | Starts | Max Moves | Difficulty |
|---|------|------|--------|---------|--------|-----------|------------|
| 1 | Patient Zero | 5×5 | 4 | 1 | Top-left | 12 | Tutorial |
| 2 | Outbreak | 6×6 | 5 | 1 | Top-left | 18 | Easy |
| 3 | Pandemic | 8×8 | 6 | 1 | Top-left | 25 | Medium (1 spare move!) |
| 4 | Contagion | 10×10 | 6 | 2 | Corners | 27 | Hard |
| 5 | Total Extinction | 12×12 | 7 | 3 | Triangle | 30 | Nightmare |

All boards are **deterministic** — same layout every time. Solutions were verified using an automated solver to guarantee solvability and ensure a tight difficulty curve.

### Multi-Virus Mechanic (Levels 4–5)

Starting from Level 4, you control **multiple virus origins** simultaneously. When you pick a color, **all** your virus blobs change color and expand at the same time. This creates a pincer strategy where viruses converge from opposite edges.

| Level | Virus Positions |
|-------|----------------|
| 4 | `(0,0)` + `(9,9)` — opposite corners |
| 5 | `(0,0)` + `(0,11)` + `(11,6)` — triangle formation |

## Architecture

### On-Chain (Move Contract)

```
sources/
├── game.move        # Game logic (~480 lines)
└── game_tests.move  # Test suite (12 tests)
```

**Key design decisions:**

- **Flat data board** — `vector<u8>` inside `GameSession`, no per-cell entities. Gas-efficient and simple.
- **Iterative BFS** — flood-fill using `vector<u64>` as a queue (no recursion limits)
- **PTB composable** — all actions are `public fun` with `entry` wrappers, allowing multiple `choose_color` calls in a single transaction
- **Deterministic levels** — hardcoded board layouts, no randomness needed

### GameSession Struct

```move
public struct GameSession has key {
    id: UID,
    state: u8,              // 0=lobby, 1=active, 2=won, 3=lost
    player: address,
    level: u8,              // 1–5
    board: vector<u8>,      // flat array of color indices
    controlled: vector<bool>, // which cells the virus owns
    controlled_count: u64,
    moves_remaining: u64,
    moves_used: u64,
    num_colors: u8,
    board_width: u64,
    board_height: u64,
    virus_starts: vector<u64>,
}
```

### Core Algorithm

```
choose_color(session, color):
  1. Assert game is active, correct player, valid color, color ≠ current
  2. Recolor all controlled cells → new color
  3. BFS from all controlled cells:
     - For each cell in queue, check 4 neighbors (up/down/left/right)
     - If neighbor matches the chosen color and isn't controlled → absorb it
  4. Decrement moves_remaining, increment moves_used
  5. If controlled_count == total_cells → WIN
  6. Else if moves_remaining == 0 → LOSE
```

### Events

| Event | When | Fields |
|-------|------|--------|
| `GameStarted` | Level begins | session_id, level, player, board size, moves |
| `ColorChosen` | Each move | session_id, color, cells absorbed, total controlled |
| `GameWon` | Board fully infected | session_id, level, moves_used |
| `GameLost` | Out of moves | session_id, level, moves_used, coverage |

### Frontend (React + Vite)

```
frontend/src/
├── dApp-kit.ts          # Wallet config
├── constants.ts         # Package IDs, colors, levels
├── main.tsx             # Providers (dApp Kit + React Query)
├── App.tsx              # Phase routing
├── lib/
│   ├── types.ts         # TypeScript types matching Move structs
│   ├── parsers.ts       # On-chain → typed objects
│   └── suiClient.ts     # JSON-RPC data reader
├── hooks/
│   ├── useGameSession.ts  # Poll GameSession (2s interval)
│   └── useGameActions.ts  # startLevel, chooseColor, batchColors
├── stores/
│   └── uiStore.ts       # Zustand (sessionId, pending state)
└── components/
    ├── LevelSelect.tsx  # Level cards
    ├── GameBoard.tsx    # CSS Grid renderer
    ├── ColorPalette.tsx # Color buttons
    ├── GameHud.tsx      # Moves + progress bars
    └── GameOver.tsx     # Win/lose results
```

## PTB Composability

The contract supports **Programmable Transaction Block** batching. Instead of one tx per move, the frontend can batch multiple `choose_color` calls:

```typescript
// Batch 3 moves in one transaction
const tx = new Transaction();
tx.moveCall({ package: PKG, module: 'game', function: 'choose_color',
  arguments: [tx.object(sessionId), tx.pure.u8(2)] });
tx.moveCall({ package: PKG, module: 'game', function: 'choose_color',
  arguments: [tx.object(sessionId), tx.pure.u8(0)] });
tx.moveCall({ package: PKG, module: 'game', function: 'choose_color',
  arguments: [tx.object(sessionId), tx.pure.u8(3)] });
```

## Running Locally

### Contract

```bash
cd examples/virus_game
sui move build
sui move test      # runs 12 tests
```

### Frontend

```bash
cd examples/virus_game/frontend
npm install
npm run dev        # http://localhost:5173
```

After deploying the contract, update `PACKAGE_ID` and `WORLD_ID` in `frontend/src/constants.ts`.

## Tests

```
✅ test_start_level_1           — board initialization
✅ test_choose_color_absorbs    — flood-fill logic
✅ test_win_level_1             — 8-move optimal solution
✅ test_lose_out_of_moves       — move exhaustion
✅ test_wrong_player_rejected   — auth check
✅ test_same_color_rejected     — no-op prevention
✅ test_invalid_color_rejected  — bounds check
✅ test_level_4_multi_virus     — 2 viruses expand simultaneously
✅ test_level_5_three_viruses   — 3 viruses, 144 cells
✅ test_ptb_multi_move          — 3 moves in one tx
✅ test_entry_wrapper           — entry function coverage
✅ test_invalid_level_rejected  — level bounds
```
