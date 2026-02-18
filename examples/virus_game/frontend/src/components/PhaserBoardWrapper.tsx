import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BoardScene } from '../lib/PhaserBoard';
import type { GameSession } from '../lib/types';

interface Props {
  game: GameSession;
}

export function PhaserBoardWrapper({ game }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const readyRef = useRef(false);
  const gameRef = useRef(game); // Always track latest game prop
  gameRef.current = game;

  // Create Phaser instance on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth || 520;
    const h = container.clientHeight || 520;

    const phaserGame = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container,
      width: w,
      height: h,
      transparent: true,
      scene: [BoardScene],   // Pass the CLASS, not an instance
      scale: {
        mode: Phaser.Scale.NONE,
      },
      banner: false,
      audio: { noAudio: true },
    });

    phaserRef.current = phaserGame;

    // Once Phaser is ready, grab the scene instance from the manager
    phaserGame.events.once('ready', () => {
      const scene = phaserGame.scene.getScene('BoardScene') as BoardScene;
      if (scene) {
        sceneRef.current = scene;
        readyRef.current = true;

        // Render the initial board state
        const g = gameRef.current;
        scene.updateBoard(g.board, g.controlled, g.boardWidth, g.boardHeight, g.virusStarts);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && phaserRef.current) {
          phaserRef.current.scale.resize(width, height);
          if (readyRef.current && sceneRef.current) {
            const g = gameRef.current;
            sceneRef.current.updateBoard(g.board, g.controlled, g.boardWidth, g.boardHeight, g.virusStarts);
          }
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      readyRef.current = false;
      resizeObserver.disconnect();
      phaserGame.destroy(true);
      phaserRef.current = null;
      sceneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync game state changes to Phaser scene
  useEffect(() => {
    if (readyRef.current && sceneRef.current) {
      sceneRef.current.updateBoard(
        game.board,
        game.controlled,
        game.boardWidth,
        game.boardHeight,
        game.virusStarts
      );
      return;
    }

    // Scene not ready yet — poll briefly
    const interval = setInterval(() => {
      if (readyRef.current && sceneRef.current) {
        sceneRef.current.updateBoard(
          game.board,
          game.controlled,
          game.boardWidth,
          game.boardHeight,
          game.virusStarts
        );
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [game.board, game.controlled, game.boardWidth, game.boardHeight, game.virusStarts]);

  return (
    <div
      ref={containerRef}
      className="phaser-board"
    />
  );
}
