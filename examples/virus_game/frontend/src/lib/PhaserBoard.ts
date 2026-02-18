import Phaser from 'phaser';
import { COLOR_PALETTE } from '../constants';

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function hexToNum(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
}

/* ═══════════════════════════════════════════════
   Board Scene
   ═══════════════════════════════════════════════ */

interface CellSprites {
    bg: Phaser.GameObjects.Graphics;
    eyeL: Phaser.GameObjects.Graphics;
    eyeR: Phaser.GameObjects.Graphics;
    pupilL: Phaser.GameObjects.Graphics;
    pupilR: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Graphics | null;
}

export class BoardScene extends Phaser.Scene {
    // Grid state
    private boardWidth = 0;
    private boardHeight = 0;
    private cellSize = 0;
    private padding = 8;
    private gap = 3;

    // Cells
    private cells: CellSprites[] = [];
    private prevBoard: number[] = [];
    private prevControlled: boolean[] = [];

    // Particle emitter graphics pool
    private particlePool: Phaser.GameObjects.Graphics[] = [];

    constructor() {
        super({ key: 'BoardScene' });
    }

    create() {
        // Scene is ready, board will be drawn on first updateBoard call
    }

    /* ── Public API called from React wrapper ─── */

    updateBoard(
        board: number[],
        controlled: boolean[],
        boardWidth: number,
        boardHeight: number,
        virusStarts: number[]
    ) {
        const sizeChanged =
            this.boardWidth !== boardWidth || this.boardHeight !== boardHeight;

        this.boardWidth = boardWidth;
        this.boardHeight = boardHeight;

        // Calculate cell size to fit the canvas
        const canvasW = this.scale.width;
        const canvasH = this.scale.height;
        const availW = canvasW - this.padding * 2;
        const availH = canvasH - this.padding * 2;
        this.cellSize = Math.floor(
            Math.min(
                (availW - this.gap * (boardWidth - 1)) / boardWidth,
                (availH - this.gap * (boardHeight - 1)) / boardHeight
            )
        );

        if (sizeChanged || this.cells.length === 0) {
            this.rebuildGrid(board, controlled, virusStarts);
        } else {
            this.diffUpdate(board, controlled, virusStarts);
        }

        this.prevBoard = [...board];
        this.prevControlled = [...controlled];
    }

    /* ── Full grid rebuild ──────────────────────── */

    private rebuildGrid(
        board: number[],
        controlled: boolean[],
        virusStarts: number[]
    ) {
        // Destroy old sprites
        this.cells.forEach((c) => {
            c.bg.destroy();
            c.eyeL.destroy();
            c.eyeR.destroy();
            c.pupilL.destroy();
            c.pupilR.destroy();
            c.glow?.destroy();
        });
        this.cells = [];

        const totalW =
            this.boardWidth * this.cellSize + (this.boardWidth - 1) * this.gap;
        const totalH =
            this.boardHeight * this.cellSize + (this.boardHeight - 1) * this.gap;
        const offsetX = (this.scale.width - totalW) / 2;
        const offsetY = (this.scale.height - totalH) / 2;

        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                const idx = row * this.boardWidth + col;
                const x = offsetX + col * (this.cellSize + this.gap);
                const y = offsetY + row * (this.cellSize + this.gap);
                const colorIdx = board[idx];
                const isControlled = controlled[idx];
                const isVirusStart = virusStarts.includes(idx);

                const cell = this.createCell(x, y, colorIdx, isControlled, isVirusStart);
                this.cells[idx] = cell;

                // Entrance animation
                if (isControlled) {
                    this.animateCellEntrance(cell, 50 + idx * 20);
                }
            }
        }
    }

    /* ── Diff update (only animate changes) ───── */

    private diffUpdate(
        board: number[],
        controlled: boolean[],
        virusStarts: number[]
    ) {
        const newlyInfected: number[] = [];

        for (let i = 0; i < board.length; i++) {
            const cell = this.cells[i];
            if (!cell) continue;

            const colorChanged = board[i] !== this.prevBoard[i];
            const justInfected = controlled[i] && !this.prevControlled[i];

            // Update color
            if (colorChanged) {
                this.updateCellColor(cell, board[i], controlled[i]);
            }

            // Newly infected
            if (justInfected) {
                newlyInfected.push(i);
                this.showEyes(cell);
                this.animateInfection(cell);
                this.spawnParticles(cell);

                // Update color + alpha
                this.updateCellColor(cell, board[i], true);
            } else if (controlled[i] && colorChanged) {
                // Existing controlled cell — morph color
                this.morphCellColor(cell, board[i]);
            }

            // Update virus start glow
            if (virusStarts.includes(i) && !cell.glow) {
                cell.glow = this.createGlow(cell);
            }
        }

        // Camera shake for big chains
        if (newlyInfected.length >= 5) {
            this.cameras.main.shake(200, 0.005);
        }
    }

    /* ── Cell creation ──────────────────────────── */

    private createCell(
        x: number,
        y: number,
        colorIdx: number,
        isControlled: boolean,
        isVirusStart: boolean
    ): CellSprites {
        const r = Math.min(6, this.cellSize * 0.12);
        const color = hexToNum(COLOR_PALETTE[colorIdx] ?? '#555555');
        const alpha = isControlled ? 1.0 : 0.55;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(color, alpha);
        bg.fillRoundedRect(x, y, this.cellSize, this.cellSize, r);
        bg.setData('x', x);
        bg.setData('y', y);
        bg.setData('colorIdx', colorIdx);

        // Eyes (hidden if not controlled)
        const eyeSize = Math.max(3, this.cellSize * 0.16);
        const pupilSize = eyeSize * 0.55;
        const eyeY = y + this.cellSize * 0.38;
        const eyeLX = x + this.cellSize * 0.33;
        const eyeRX = x + this.cellSize * 0.67;

        const eyeL = this.add.graphics();
        const eyeR = this.add.graphics();
        const pupilL = this.add.graphics();
        const pupilR = this.add.graphics();

        // Draw white of eyes
        eyeL.fillStyle(0xffffff, 1);
        eyeL.fillCircle(eyeLX, eyeY, eyeSize);
        eyeR.fillStyle(0xffffff, 1);
        eyeR.fillCircle(eyeRX, eyeY, eyeSize);

        // Draw pupils
        pupilL.fillStyle(0x111111, 1);
        pupilL.fillCircle(eyeLX, eyeY, pupilSize);
        pupilR.fillStyle(0x111111, 1);
        pupilR.fillCircle(eyeRX, eyeY, pupilSize);

        if (!isControlled) {
            eyeL.setVisible(false);
            eyeR.setVisible(false);
            pupilL.setVisible(false);
            pupilR.setVisible(false);
        } else {
            // Start jiggle
            this.startPupilJiggle(pupilL, eyeLX, eyeY, pupilSize);
            this.startPupilJiggle(pupilR, eyeRX, eyeY, pupilSize);
        }

        // Glow for virus start
        let glow: Phaser.GameObjects.Graphics | null = null;
        if (isVirusStart && isControlled) {
            glow = this.createGlow({ bg, eyeL, eyeR, pupilL, pupilR, glow: null });
        }

        return { bg, eyeL, eyeR, pupilL, pupilR, glow };
    }

    /* ── Googly eye jiggle ──────────────────────── */

    private startPupilJiggle(
        pupilGfx: Phaser.GameObjects.Graphics,
        centerX: number,
        centerY: number,
        pupilSize: number
    ) {
        const jiggle = () => {
            const maxOffset = pupilSize * 0.5;
            const tx = centerX + (Math.random() - 0.5) * maxOffset * 2;
            const ty = centerY + (Math.random() - 0.5) * maxOffset * 2;

            // Redraw pupil at new position
            this.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 300 + Math.random() * 400,
                ease: 'Sine.easeInOut',
                onUpdate: (tween) => {
                    const progress = tween.getValue() ?? 0;
                    const lastX = (pupilGfx.getData('lastX') as number | undefined) ?? centerX;
                    const lastY = (pupilGfx.getData('lastY') as number | undefined) ?? centerY;
                    const curX = Phaser.Math.Linear(lastX, tx, progress);
                    const curY = Phaser.Math.Linear(lastY, ty, progress);
                    pupilGfx.clear();
                    pupilGfx.fillStyle(0x111111, 1);
                    pupilGfx.fillCircle(curX, curY, pupilSize);
                },
                onComplete: () => {
                    pupilGfx.setData('lastX', tx);
                    pupilGfx.setData('lastY', ty);
                    // Schedule next jiggle
                    this.time.delayedCall(500 + Math.random() * 1500, jiggle);
                },
            });
        };

        // Initial delay so not all eyes jiggle in sync
        this.time.delayedCall(Math.random() * 2000, jiggle);
    }

    /* ── Show eyes on newly infected cell ───────── */

    private showEyes(cell: CellSprites) {
        cell.eyeL.setVisible(true);
        cell.eyeR.setVisible(true);
        cell.pupilL.setVisible(true);
        cell.pupilR.setVisible(true);

        // Start jiggle for the pupils
        const x = cell.bg.getData('x') as number;
        const y = cell.bg.getData('y') as number;
        const eyeSize = Math.max(3, this.cellSize * 0.16);
        const pupilSize = eyeSize * 0.55;
        const eyeY = y + this.cellSize * 0.38;

        this.startPupilJiggle(
            cell.pupilL,
            x + this.cellSize * 0.33,
            eyeY,
            pupilSize
        );
        this.startPupilJiggle(
            cell.pupilR,
            x + this.cellSize * 0.67,
            eyeY,
            pupilSize
        );
    }

    /* ── Cell color update ──────────────────────── */

    private updateCellColor(
        cell: CellSprites,
        colorIdx: number,
        isControlled: boolean
    ) {
        const x = cell.bg.getData('x') as number;
        const y = cell.bg.getData('y') as number;
        const r = Math.min(6, this.cellSize * 0.12);
        const color = hexToNum(COLOR_PALETTE[colorIdx] ?? '#555555');
        const alpha = isControlled ? 1.0 : 0.55;

        cell.bg.clear();
        cell.bg.fillStyle(color, alpha);
        cell.bg.fillRoundedRect(x, y, this.cellSize, this.cellSize, r);
        cell.bg.setData('colorIdx', colorIdx);
    }

    /* ── Smooth color morph for existing cells ─── */

    private morphCellColor(cell: CellSprites, targetColorIdx: number) {
        const x = cell.bg.getData('x') as number;
        const y = cell.bg.getData('y') as number;
        const r = Math.min(6, this.cellSize * 0.12);
        const oldColorIdx = cell.bg.getData('colorIdx') as number;
        const oldColor = Phaser.Display.Color.HexStringToColor(
            COLOR_PALETTE[oldColorIdx] ?? '#555555'
        );
        const newColor = Phaser.Display.Color.HexStringToColor(
            COLOR_PALETTE[targetColorIdx] ?? '#555555'
        );

        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const t = (tween.getValue() ?? 0) / 100;
                const rr = Math.round(
                    Phaser.Math.Linear(oldColor.red, newColor.red, t)
                );
                const gg = Math.round(
                    Phaser.Math.Linear(oldColor.green, newColor.green, t)
                );
                const bb = Math.round(
                    Phaser.Math.Linear(oldColor.blue, newColor.blue, t)
                );
                const blended = Phaser.Display.Color.GetColor(rr, gg, bb);

                cell.bg.clear();
                cell.bg.fillStyle(blended, 1.0);
                cell.bg.fillRoundedRect(x, y, this.cellSize, this.cellSize, r);
            },
            onComplete: () => {
                cell.bg.setData('colorIdx', targetColorIdx);
            },
        });
    }

    /* ── Infection bounce animation ─────────────── */

    private animateInfection(cell: CellSprites) {
        const allParts = [
            cell.bg,
            cell.eyeL,
            cell.eyeR,
            cell.pupilL,
            cell.pupilR,
        ];

        // Scale bounce using scaleX/scaleY on graphics
        allParts.forEach((part) => {
            part.setScale(0.3);
        });

        this.tweens.add({
            targets: allParts,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut',
        });
    }

    /* ── Entrance animation (initial board load) ── */

    private animateCellEntrance(cell: CellSprites, delay: number) {
        const allParts = [
            cell.bg,
            cell.eyeL,
            cell.eyeR,
            cell.pupilL,
            cell.pupilR,
        ];

        allParts.forEach((part) => {
            part.setScale(0);
            part.setAlpha(0);
        });

        this.tweens.add({
            targets: allParts,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 350,
            delay,
            ease: 'Back.easeOut',
        });
    }

    /* ── Particle burst on infection ─────────────── */

    private spawnParticles(cell: CellSprites) {
        const x = (cell.bg.getData('x') as number) + this.cellSize / 2;
        const y = (cell.bg.getData('y') as number) + this.cellSize / 2;
        const colorIdx = cell.bg.getData('colorIdx') as number;
        const color = hexToNum(COLOR_PALETTE[colorIdx] ?? '#555555');
        const count = 6 + Math.floor(Math.random() * 3);

        for (let i = 0; i < count; i++) {
            const particle =
                this.particlePool.pop() || this.add.graphics();
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const dist = this.cellSize * 0.6 + Math.random() * this.cellSize * 0.4;
            const size = 2 + Math.random() * 3;

            particle.clear();
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, size);
            particle.setPosition(x, y);
            particle.setAlpha(1);
            particle.setScale(1);
            particle.setVisible(true);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 400 + Math.random() * 200,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    particle.setVisible(false);
                    this.particlePool.push(particle);
                },
            });
        }
    }

    /* ── Glow effect for virus start cells ────── */

    private createGlow(cell: CellSprites): Phaser.GameObjects.Graphics {
        const x = (cell.bg.getData('x') as number) + this.cellSize / 2;
        const y = (cell.bg.getData('y') as number) + this.cellSize / 2;
        const radius = this.cellSize * 0.6;

        const glow = this.add.graphics();
        glow.fillStyle(0x39ff14, 0.15);
        glow.fillCircle(x, y, radius);

        // Move behind cell
        glow.setDepth(-1);

        // Pulse animation
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 0.2 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        return glow;
    }
}
