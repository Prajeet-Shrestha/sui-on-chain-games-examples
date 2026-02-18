// ═══════════════════════════════════════════════
// SuiFlap — Flappy Bird Game Engine (Canvas)
// Pure game logic + rendering, no React dependency
// ═══════════════════════════════════════════════

// ─── Types ───
export interface FlappyState {
    bird: { x: number; y: number; velocity: number; rotation: number };
    pipes: Pipe[];
    score: number;
    pipesPassed: number;
    isGameOver: boolean;
    frameCount: number;
    groundOffset: number;
    starField: Star[];
}

interface Pipe {
    x: number;
    gapY: number;
    gapHeight: number;
    width: number;
    scored: boolean;
}

interface Star {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
}

// ─── Constants ───
export const CANVAS_WIDTH = 520;
export const CANVAS_HEIGHT = 780;

const BIRD_SIZE = 32;
const BIRD_X = 100;
const GRAVITY = 0.45;
const FLAP_FORCE = -7.8;
const MAX_VELOCITY = 10;
const PIPE_WIDTH = 58;
const PIPE_GAP = 170;
const PIPE_SPEED = 2.8;
const PIPE_SPAWN_INTERVAL = 95; // frames
const GROUND_HEIGHT = 70;
const GROUND_SPEED = 2.8;

// ─── Colors ───
const COLORS = {
    skyTop: '#0a0e27',
    skyBottom: '#1a1040',
    bird: '#ffdd57',
    birdWing: '#f59e0b',
    birdEye: '#1a1a2e',
    pipeBody: '#00e5ff',
    pipeEdge: '#00bcd4',
    pipeShadow: 'rgba(0, 229, 255, 0.15)',
    pipeGlow: 'rgba(0, 229, 255, 0.4)',
    ground: '#161130',
    groundLine: '#7c3aed',
    groundGrid: 'rgba(124, 58, 237, 0.2)',
    scoreGlow: '#00e5ff',
    star: '#ffffff',
};

// ─── Create initial state ───
export function createInitialState(): FlappyState {
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT),
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
            opacity: Math.random() * 0.8 + 0.2,
        });
    }

    return {
        bird: { x: BIRD_X, y: CANVAS_HEIGHT / 2.5, velocity: 0, rotation: 0 },
        pipes: [],
        score: 0,
        pipesPassed: 0,
        isGameOver: false,
        frameCount: 0,
        groundOffset: 0,
        starField: stars,
    };
}

// ─── Flap action ───
export function flap(state: FlappyState): void {
    if (state.isGameOver) return;
    state.bird.velocity = FLAP_FORCE;
}

// ─── Update game state (called each frame) ───
export function update(state: FlappyState): void {
    if (state.isGameOver) return;

    state.frameCount++;

    // Bird physics
    state.bird.velocity = Math.min(state.bird.velocity + GRAVITY, MAX_VELOCITY);
    state.bird.y += state.bird.velocity;
    state.bird.rotation = Math.min(Math.max(state.bird.velocity * 3, -30), 70);

    // Ground scrolling
    state.groundOffset = (state.groundOffset + GROUND_SPEED) % 40;

    // Star parallax
    for (const star of state.starField) {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = CANVAS_WIDTH;
            star.y = Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT);
        }
    }

    // Spawn pipes
    if (state.frameCount % PIPE_SPAWN_INTERVAL === 0) {
        const minGapY = 80;
        const maxGapY = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 80;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

        state.pipes.push({
            x: CANVAS_WIDTH + 10,
            gapY,
            gapHeight: PIPE_GAP,
            width: PIPE_WIDTH,
            scored: false,
        });
    }

    // Move pipes
    for (const pipe of state.pipes) {
        pipe.x -= PIPE_SPEED;
    }

    // Remove off-screen pipes
    state.pipes = state.pipes.filter(p => p.x + p.width > -10);

    // Score
    for (const pipe of state.pipes) {
        if (!pipe.scored && pipe.x + pipe.width < BIRD_X) {
            pipe.scored = true;
            state.score += 1;
            state.pipesPassed += 1;
        }
    }

    // Collision detection
    const birdLeft = state.bird.x - BIRD_SIZE / 2;
    const birdRight = state.bird.x + BIRD_SIZE / 2;
    const birdTop = state.bird.y - BIRD_SIZE / 2;
    const birdBottom = state.bird.y + BIRD_SIZE / 2;

    // Ground / ceiling
    if (birdBottom >= CANVAS_HEIGHT - GROUND_HEIGHT || birdTop <= 0) {
        state.isGameOver = true;
        return;
    }

    // Pipe collision
    for (const pipe of state.pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipe.width;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check top pipe
            if (birdTop < pipe.gapY) {
                state.isGameOver = true;
                return;
            }
            // Check bottom pipe
            if (birdBottom > pipe.gapY + pipe.gapHeight) {
                state.isGameOver = true;
                return;
            }
        }
    }
}

// ─── Render ───
export function render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, COLORS.skyTop);
    skyGrad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const star of state.starField) {
        ctx.globalAlpha = star.opacity * (0.5 + Math.sin(state.frameCount * 0.02 + star.x) * 0.5);
        ctx.fillStyle = COLORS.star;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pipes
    for (const pipe of state.pipes) {
        drawPipe(ctx, pipe, state.frameCount);
    }

    // Ground
    drawGround(ctx, state);

    // Bird
    drawBird(ctx, state);

    // Score
    drawScore(ctx, state);
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe, frame: number): void {
    const h = CANVAS_HEIGHT;

    // Glow behind pipes
    ctx.shadowColor = COLORS.pipeGlow;
    ctx.shadowBlur = 20;

    // Top pipe
    const topPipeBottom = pipe.gapY;
    const grad1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    grad1.addColorStop(0, COLORS.pipeEdge);
    grad1.addColorStop(0.3, COLORS.pipeBody);
    grad1.addColorStop(0.7, COLORS.pipeBody);
    grad1.addColorStop(1, COLORS.pipeEdge);

    ctx.fillStyle = grad1;
    ctx.fillRect(pipe.x, 0, pipe.width, topPipeBottom);

    // Top pipe cap
    ctx.fillStyle = COLORS.pipeBody;
    ctx.fillRect(pipe.x - 4, topPipeBottom - 20, pipe.width + 8, 20);
    ctx.strokeStyle = COLORS.pipeGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x - 4, topPipeBottom - 20, pipe.width + 8, 20);

    // Bottom pipe
    const bottomPipeTop = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = grad1;
    ctx.fillRect(pipe.x, bottomPipeTop, pipe.width, h - bottomPipeTop - GROUND_HEIGHT);

    // Bottom pipe cap
    ctx.fillStyle = COLORS.pipeBody;
    ctx.fillRect(pipe.x - 4, bottomPipeTop, pipe.width + 8, 20);
    ctx.strokeStyle = COLORS.pipeGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x - 4, bottomPipeTop, pipe.width + 8, 20);

    ctx.shadowBlur = 0;

    // Energy pulse on pipes
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(0, 229, 255, ${0.08 * pulse})`;
    ctx.fillRect(pipe.x + 4, 0, pipe.width - 8, topPipeBottom - 20);
    ctx.fillRect(pipe.x + 4, bottomPipeTop + 20, pipe.width - 8, h - bottomPipeTop - GROUND_HEIGHT - 20);
}

function drawBird(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const { bird, frameCount } = state;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate((bird.rotation * Math.PI) / 180);

    // Wing flap animation
    const wingFlap = Math.sin(frameCount * 0.3) * 6;

    // Body glow
    ctx.shadowColor = COLORS.bird;
    ctx.shadowBlur = 15;

    // Body
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = COLORS.birdWing;
    ctx.beginPath();
    ctx.ellipse(-4, wingFlap - 2, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.birdEye;
    ctx.beginPath();
    ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(20, 2);
    ctx.lineTo(13, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const groundY = h - GROUND_HEIGHT;

    // Ground fill
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, groundY, w, GROUND_HEIGHT);

    // Glowing top line
    ctx.strokeStyle = COLORS.groundLine;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.groundLine;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Grid pattern
    ctx.strokeStyle = COLORS.groundGrid;
    ctx.lineWidth = 1;
    for (let x = -state.groundOffset; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - 20, h);
        ctx.stroke();
    }
    for (let y = groundY + 15; y < h; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
}

function drawScore(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    ctx.save();
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    // Score shadow/glow
    ctx.shadowColor = COLORS.scoreGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(state.score), CANVAS_WIDTH / 2, 50);

    ctx.shadowBlur = 0;
    ctx.restore();
}
