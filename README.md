# Sui On-Chain Game Examples

Workable examples of **fully on-chain games** built on [Sui](https://sui.io) using the [Sui Game Engine](https://github.com/Prajeet-Shrestha/sui-game-engine).


## Games

| Game | Tags | Description |
|------|------|-------------|
| [Card Crawler](./examples/card_crawler/) | Strategy, Deck Builder | A deck-building dungeon crawler. Draft cards, fight monsters, and survive the dungeon — all verified on-chain |
| [Flappy Bird](./examples/flappy_bird/) | Arcade, Casual | A decentralized clone of the classic Flappy Bird game |
| [Maze Game](./examples/maze_game/) | Puzzle, Strategy | Navigate through a maze on the Sui blockchain |
| [Sokoban](./examples/sokoban/) | Puzzle, Pixel Art | The classic box-pushing puzzle game, reimagined with pixel art and on-chain solution verification |
| [SuiCraft](./examples/sandbox_game/) | Sandbox, Building | A fully on-chain sandbox game on Sui |
| [Sui Tetris](./examples/tetris_game/) | Arcade, Puzzle | A fully on-chain Tetris game |
| [Tactics Ogre](./examples/tactics_ogre/) | Multi-Players, Tactics, RPG | A tactical RPG with squad management, turn-based combat on isometric grids, and full on-chain battles |
| [Virus Game](./examples/virus_game/) | Puzzle, Strategy | Change your color to match neighboring cells and absorb them. Conquer the entire grid before you run out of moves |

## Getting Started

### 1. Clone & Setup Skills

```bash
git clone https://github.com/Prajeet-Shrestha/sui-on-chain-games-examples.git
cd sui-on-chain-games-examples
chmod +x setup_agent.sh
./setup_agent.sh
```

### 2. Run a Game Frontend

```bash
cd examples/card_crawler/frontend
npm install
npm run dev
```

### 3. Run the Landing Page

The landing page is a Vite + React app that auto-discovers all games from their `example.json` manifests.

```bash
cd site
npm install
npm run dev
```

## Adding a New Example

1. Create a folder under `examples/` (use underscores, e.g. `tic_tac_toe`)
2. Add a `cover.png` image (used as the card banner on the landing page)
3. Create an `example.json` manifest:

```json
{
  "name": "Tic-Tac-Toe",
  "slug": "tic-tac-toe",
  "tags": ["Strategy", "Classic"],
  "description": "The classic two-player game, fully on-chain.",
  "hasFrontend": true
}
```

| Field | Description |
|-------|-------------|
| `name` | Display name shown on the game card |
| `slug` | URL path segment (e.g. `/tic-tac-toe/`) and dist folder name |
| `tags` | Array of category tags displayed on the card |
| `description` | Short description shown below the tags |
| `hasFrontend` | If `true`, `build-site.sh` will build `frontend/` with Vite |

The landing page discovers new examples automatically — no manual site regeneration needed.

## Agent Skills

These games are built with the help of AI agent skills that provide structured knowledge for game development on Sui:

| Skill | Source | Purpose |
|-------|--------|---------|
| [sui-on-chain-game-builder-skills](https://github.com/Prajeet-Shrestha/sui-on-chain-game-builder-skills) | `git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-builder-skills.git` | Move contract patterns, ECS engine architecture, game design workflows |
| [sui-move-skills](https://github.com/Prajeet-Shrestha/sui-move-skills) | `git clone https://github.com/Prajeet-Shrestha/sui-move-skills.git` | Sui Move language fundamentals, testing, deployment |
| [sui-on-chain-game-frontend-builder](https://github.com/Prajeet-Shrestha/sui-on-chain-game-frontend-builder) | `git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-frontend-builder.git` | Vite + React + TypeScript frontend — wallet, transactions, game state, real-time updates |
| [phaser-gamedev](https://github.com/chongdashu/phaserjs-tinyswords) | `npx skills add https://github.com/chongdashu/phaserjs-tinyswords --skill phaser-gamedev` | Phaser 3 game framework — sprites, physics, tilemaps, animations |
| [game-design-theory](https://github.com/pluginagentmarketplace/custom-plugin-game-developer) | `npx skills add https://github.com/pluginagentmarketplace/custom-plugin-game-developer --skill game-design-theory` | MDA framework, player psychology, balance, progression systems |

## Tech Stack

- **On-Chain**: [Sui Move](https://docs.sui.io/concepts/sui-move-concepts) + [Sui Game Engine (ECS)](https://github.com/Prajeet-Shrestha/sui-game-engine)
- **Frontend**: Vite + React + TypeScript
- **Sui SDK**: `@mysten/dapp-kit-react`, `@mysten/sui`
- **State Management**: `@tanstack/react-query`, `zustand`

## License

MIT
