export interface FileEntry {
    path: string;
    content: string;
    size: number;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    children?: FileNode[];
}

export const MOCK_FILES: FileEntry[] = [
    {
        path: 'Move.toml',
        size: 245,
        content: `[package]
name = "tic_tac_toe"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
tic_tac_toe = "0x0"`,
    },
    {
        path: 'sources/game.move',
        size: 1842,
        content: `module tic_tac_toe::game {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// The game board — a 3x3 grid
    struct Board has key, store {
        id: UID,
        cells: vector<vector<u8>>,
        current_turn: u8,
        player_x: address,
        player_o: address,
        status: u8, // 0 = active, 1 = X wins, 2 = O wins, 3 = draw
    }

    /// Create a new game
    public entry fun create_game(
        player_o: address,
        ctx: &mut TxContext,
    ) {
        let board = Board {
            id: object::new(ctx),
            cells: vector[
                vector[0, 0, 0],
                vector[0, 0, 0],
                vector[0, 0, 0],
            ],
            current_turn: 1, // X goes first
            player_x: tx_context::sender(ctx),
            player_o,
            status: 0,
        };
        transfer::share_object(board);
    }

    /// Make a move
    public entry fun make_move(
        board: &mut Board,
        row: u64,
        col: u64,
        ctx: &mut TxContext,
    ) {
        assert!(board.status == 0, 0); // game must be active
        let sender = tx_context::sender(ctx);

        // Validate turn
        if (board.current_turn == 1) {
            assert!(sender == board.player_x, 1);
        } else {
            assert!(sender == board.player_o, 1);
        };

        // Place the mark
        let row_vec = vector::borrow_mut(&mut board.cells, row);
        let cell = vector::borrow_mut(row_vec, col);
        assert!(*cell == 0, 2); // cell must be empty
        *cell = board.current_turn;

        // Check for winner
        check_winner(board);

        // Switch turns
        board.current_turn = if (board.current_turn == 1) 2 else 1;
    }

    fun check_winner(board: &mut Board) {
        // Check rows, columns, and diagonals
        // ... (winner detection logic)
    }
}`,
    },
    {
        path: 'sources/tests.move',
        size: 680,
        content: `#[test_only]
module tic_tac_toe::game_tests {
    use sui::test_scenario;
    use tic_tac_toe::game;

    #[test]
    fun test_create_game() {
        let player_x = @0xA;
        let player_o = @0xB;

        let mut scenario = test_scenario::begin(player_x);
        {
            game::create_game(player_o, scenario.ctx());
        };

        // Verify game was created and shared
        scenario.next_tx(player_x);
        {
            let board = scenario.take_shared<game::Board>();
            assert!(board.status == 0, 0);
            scenario.return_shared(board);
        };

        scenario.end();
    }
}`,
    },
    {
        path: 'ui/package.json',
        size: 312,
        content: `{
  "name": "tic-tac-toe-ui",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@mysten/dapp-kit": "^0.14.0"
  }
}`,
    },
    {
        path: 'ui/src/App.tsx',
        size: 1205,
        content: `import { useState } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export default function App() {
  const account = useCurrentAccount();
  const [board, setBoard] = useState<number[][]>(
    Array(3).fill(null).map(() => Array(3).fill(0))
  );

  const handleCellClick = (row: number, col: number) => {
    if (!account || board[row][col] !== 0) return;
    // Call make_move transaction
    console.log(\`Move at (\${row}, \${col})\`);
  };

  return (
    <div className="app">
      <header>
        <h1>Tic Tac Toe</h1>
        <ConnectButton />
      </header>
      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="row">
            {row.map((cell, c) => (
              <button
                key={c}
                className="cell"
                onClick={() => handleCellClick(r, c)}
              >
                {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}`,
    },
    {
        path: 'ui/src/main.tsx',
        size: 280,
        content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SuiClientProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  </StrictMode>
);`,
    },
    {
        path: 'ui/index.html',
        size: 180,
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tic Tac Toe</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
    },
];

/** Build a nested file tree from flat file entries */
export function buildFileTree(files: FileEntry[]): FileNode[] {
    const root: FileNode[] = [];

    for (const file of files) {
        const parts = file.path.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const isFile = i === parts.length - 1;
            const fullPath = parts.slice(0, i + 1).join('/');

            let existing = current.find((n) => n.name === name);
            if (!existing) {
                existing = {
                    name,
                    path: fullPath,
                    type: isFile ? 'file' : 'directory',
                    ...(isFile ? { size: file.size } : { children: [] }),
                };
                current.push(existing);
            }
            if (!isFile) {
                current = existing.children!;
            }
        }
    }

    // Sort: directories first, then alphabetical
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
        }).map((n) => {
            if (n.children) n.children = sortNodes(n.children);
            return n;
        });
    };

    return sortNodes(root);
}
