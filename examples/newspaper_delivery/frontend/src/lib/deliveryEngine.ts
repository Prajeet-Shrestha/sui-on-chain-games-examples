import { audio } from './audio';

// ═══════════════════════════════════════════════
// City Delivery — Game Engine v2.2
// Physical projectile scoring, limited ammo, slower pace
// ═══════════════════════════════════════════════

// ─── Level Config (Adjusted for slower pace) ───
export interface LevelConfig {
    level: number;
    name: string;
    houseCount: number;       // total houses (scenery + mailbox)
    mailboxRatio: number;     // fraction of houses that have mailboxes
    baseSpeed: number;
    maxSpeed: number;
    perfectZone: number;      // px distance from mailbox centre
    goodZone: number;
    okZone: number;
    houseSpawnGap: number;    // px gap between houses (increased)
    skyGrad: [string, string, string];
    terrain: { amplitude: number; frequency: number };
    // Per-level visual variety
    skylineColor: string;
    skylineWindowColor: string;
    skylineMinH: number;
    skylineMaxH: number;
    roadGrad: [string, string, string];    // top, mid, bottom
    grassGrad: [string, string];           // top, bottom
    sidewalkColor: string;
    curbColor: string;
}

export const LEVELS: LevelConfig[] = [
    { level: 0, name: 'Sunny Suburbs', houseCount: 40, mailboxRatio: 0.75, baseSpeed: 2.5, maxSpeed: 3.2, perfectZone: 30, goodZone: 60, okZone: 90, houseSpawnGap: 300, skyGrad: ['#0d1b2a', '#1b2838', '#2a4060'], terrain: { amplitude: 0, frequency: 0 }, skylineColor: '#0a1520', skylineWindowColor: 'rgba(255,220,120,0.18)', skylineMinH: 25, skylineMaxH: 80, roadGrad: ['#3a3a40', '#444448', '#3a3a40'], grassGrad: ['#1e4a28', '#12301a'], sidewalkColor: '#5a5a62', curbColor: '#6a6a70' },
    { level: 1, name: 'Maple Lane', houseCount: 44, mailboxRatio: 0.70, baseSpeed: 2.8, maxSpeed: 3.6, perfectZone: 28, goodZone: 56, okZone: 85, houseSpawnGap: 290, skyGrad: ['#0a1628', '#182a46', '#28406a'], terrain: { amplitude: 4, frequency: 0.04 }, skylineColor: '#0c1018', skylineWindowColor: 'rgba(255,200,100,0.15)', skylineMinH: 30, skylineMaxH: 100, roadGrad: ['#353538', '#3e3e42', '#353538'], grassGrad: ['#1a3820', '#0f2515'], sidewalkColor: '#525258', curbColor: '#626268' },
    { level: 2, name: 'Elm Street', houseCount: 48, mailboxRatio: 0.65, baseSpeed: 3.2, maxSpeed: 4.0, perfectZone: 26, goodZone: 52, okZone: 80, houseSpawnGap: 280, skyGrad: ['#100a20', '#261540', '#3c2060'], terrain: { amplitude: 25, frequency: 0.005 }, skylineColor: '#0a0818', skylineWindowColor: 'rgba(200,180,255,0.18)', skylineMinH: 40, skylineMaxH: 130, roadGrad: ['#302830', '#382e38', '#302830'], grassGrad: ['#162a1e', '#0c2012'], sidewalkColor: '#4a4852', curbColor: '#5a5860' },
    { level: 3, name: 'Oakwood Heights', houseCount: 52, mailboxRatio: 0.60, baseSpeed: 3.6, maxSpeed: 4.5, perfectZone: 24, goodZone: 48, okZone: 75, houseSpawnGap: 270, skyGrad: ['#0d1520', '#1a2a40', '#2a4055'], terrain: { amplitude: 40, frequency: 0.003 }, skylineColor: '#08101a', skylineWindowColor: 'rgba(180,220,255,0.20)', skylineMinH: 50, skylineMaxH: 150, roadGrad: ['#2e2e34', '#383840', '#2e2e34'], grassGrad: ['#183220', '#0e2416'], sidewalkColor: '#484850', curbColor: '#585860' },
    { level: 4, name: 'Hillcrest Drive', houseCount: 56, mailboxRatio: 0.55, baseSpeed: 4.0, maxSpeed: 5.0, perfectZone: 22, goodZone: 44, okZone: 70, houseSpawnGap: 260, skyGrad: ['#12081c', '#28103c', '#3c1858'], terrain: { amplitude: 50, frequency: 0.006 }, skylineColor: '#0c0614', skylineWindowColor: 'rgba(220,160,255,0.22)', skylineMinH: 55, skylineMaxH: 160, roadGrad: ['#28222c', '#302830', '#28222c'], grassGrad: ['#14261c', '#0a1c12'], sidewalkColor: '#44404c', curbColor: '#545058' },
    { level: 5, name: 'Thunderbolt Terrace', houseCount: 60, mailboxRatio: 0.50, baseSpeed: 4.5, maxSpeed: 6.0, perfectZone: 20, goodZone: 40, okZone: 65, houseSpawnGap: 250, skyGrad: ['#080810', '#141028', '#201840'], terrain: { amplitude: 35, frequency: 0.01 }, skylineColor: '#050510', skylineWindowColor: 'rgba(150,200,255,0.25)', skylineMinH: 60, skylineMaxH: 180, roadGrad: ['#222228', '#2a2a30', '#222228'], grassGrad: ['#101e16', '#081810'], sidewalkColor: '#3e3e48', curbColor: '#4e4e58' },
];

// ─── Types ───
export interface DeliveryState {
    canvasWidth: number;
    canvasHeight: number;
    currentLevel: number;
    levelConfig: LevelConfig;
    levelPhase: 'playing' | 'levelComplete' | 'allComplete' | 'failed';
    levelCompleteTimer: number;
    cyclist: { x: number; y: number; pedalAngle: number; armAngle: number };
    houses: House[];
    newspapers: Newspaper[];
    particles: Particle[];
    score: number;
    totalDeliveries: number;
    perfectCount: number;
    goodCount: number;
    okCount: number;
    missCount: number;
    levelScore: number;
    levelPerfect: number;
    levelGood: number;
    levelOk: number;
    levelMiss: number;
    levelMailboxCount: number;
    isGameOver: boolean;
    frameCount: number;
    groundOffset: number;
    houseSpawnTimer: number;
    housesDelivered: number;   // mailbox houses that have been delivered/missed
    currentHouseIndex: number;
    lastThrowResult: ThrowResult | null;
    throwResultTimer: number;
    deliveryLog: DeliveryRecord[];
    speed: number;
    cloudField: Cloud[];
    skyline: Building[];
    combo: number;
    maxCombo: number;
    perLevelScores: number[];
    newspapersRemaining: number; // Limited ammo
    distanceTraveled: number;
}

export interface House {
    x: number;
    width: number;
    height: number;
    color: string;
    roofColor: string;
    doorColor: string;
    roofStyle: 'triangle' | 'flat' | 'steep';
    hasMailbox: boolean;
    mailboxX: number;       // relative offset from house.x for mailbox position
    hasFence: boolean;
    delivered: boolean;
    houseId: number;
    windowRows: number;
    windowCols: number;
    hasChimney: boolean;
    chimneyOffset: number;
}

export interface Newspaper {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    rotation: number;
    active: boolean; // if false, it's removed
    landed: boolean; // true if it hit the ground/mailbox
    trail: { x: number; y: number; alpha: number }[];
    age: number;
}

export interface Particle {
    x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
}

export interface ThrowResult {
    tier: number; label: string; points: number; color: string; x: number; y: number;
}

export interface DeliveryRecord {
    houseId: number; scoreTier: number; cumulativeScore: number; deliveryNumber: number;
}

interface Cloud {
    x: number; y: number; width: number; height: number; speed: number; opacity: number;
}

interface Building {
    x: number; width: number; height: number; color: string; windows: boolean[];
}

// ─── Per-Level House Palettes ───
const LEVEL_PALETTES: { wall: string; roof: string; door: string }[][] = [
    // Level 0 — Sunny Suburbs (warm pastels)
    [
        { wall: '#7eb5d6', roof: '#5a8fb0', door: '#3a6a88' },
        { wall: '#d4a574', roof: '#b08050', door: '#8a6040' },
        { wall: '#8ec49a', roof: '#6aa078', door: '#4a7858' },
        { wall: '#c4a4b4', roof: '#a08494', door: '#7a6474' },
        { wall: '#dab888', roof: '#ba9868', door: '#9a7848' },
    ],
    // Level 1 — Maple Lane (autumn warm tones)
    [
        { wall: '#c49060', roof: '#a07040', door: '#7a5030' },
        { wall: '#8a6a50', roof: '#6c4c34', door: '#4e3020' },
        { wall: '#b8946a', roof: '#98744a', door: '#785434' },
        { wall: '#a87860', roof: '#885840', door: '#683828' },
        { wall: '#c4a080', roof: '#a48060', door: '#846040' },
    ],
    // Level 2 — Elm Street (purple-tinted dusk)
    [
        { wall: '#8878a8', roof: '#685888', door: '#484068' },
        { wall: '#7a6898', roof: '#5a4878', door: '#3a2858' },
        { wall: '#9888a8', roof: '#786888', door: '#584868' },
        { wall: '#6a6090', roof: '#4a4070', door: '#2a2050' },
        { wall: '#a898b8', roof: '#887898', door: '#685878' },
    ],
    // Level 3 — Oakwood Heights (blue-gray urban)
    [
        { wall: '#6888a0', roof: '#486880', door: '#2a4860' },
        { wall: '#788898', roof: '#586878', door: '#384858' },
        { wall: '#5a7890', roof: '#3a5870', door: '#1a3850' },
        { wall: '#8898a8', roof: '#687888', door: '#485868' },
        { wall: '#607888', roof: '#405868', door: '#203848' },
    ],
    // Level 4 — Hillcrest Drive (moody purple/dark)
    [
        { wall: '#605070', roof: '#403050', door: '#201030' },
        { wall: '#504060', roof: '#302040', door: '#100020' },
        { wall: '#706080', roof: '#504060', door: '#302040' },
        { wall: '#584868', roof: '#382848', door: '#180828' },
        { wall: '#685878', roof: '#483858', door: '#281838' },
    ],
    // Level 5 — Thunderbolt Terrace (dark industrial)
    [
        { wall: '#484858', roof: '#282838', door: '#181828' },
        { wall: '#3a3a4a', roof: '#1a1a2a', door: '#0a0a1a' },
        { wall: '#505060', roof: '#303040', door: '#202030' },
        { wall: '#424252', roof: '#222232', door: '#121222' },
        { wall: '#585868', roof: '#383848', door: '#282838' },
    ],
];

function getGroundY(ch: number): number { return ch * 0.82; }
function getRoadTopY(ch: number): number { return ch * 0.72; }
function getSidewalkY(ch: number): number { return ch * 0.70; }
function getCyclistX(_cw: number): number { return 160; }
function getCyclistY(ch: number): number { return getRoadTopY(ch) - 10; }
function getHouseBaseY(ch: number): number { return getSidewalkY(ch) - 4; }

export function getTerrainOffset(x: number, state: DeliveryState): number {
    const { amplitude, frequency } = state.levelConfig.terrain;
    if (amplitude === 0) return 0;
    return Math.sin((x + state.distanceTraveled) * frequency) * amplitude;
}

// Adjusted throw physics for slower game speed
const THROW_VX = 5.5; // Slightly slower horizontal
const THROW_VY = -9;
const THROW_GRAVITY = 0.38;

// ─── Create State ───
export function createInitialState(canvasWidth: number, canvasHeight: number, level: number = 0): DeliveryState {
    const config = LEVELS[level];
    const clouds: Cloud[] = [];
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * (canvasHeight * 0.18) + 10,
            width: 60 + Math.random() * 100,
            height: 14 + Math.random() * 18,
            speed: 0.15 + Math.random() * 0.3,
            opacity: 0.06 + Math.random() * 0.12,
        });
    }

    const skyline: Building[] = [];
    let bx = 0;
    while (bx < canvasWidth + 200) {
        const w = 30 + Math.random() * 70;
        const h = config.skylineMinH + Math.random() * (config.skylineMaxH - config.skylineMinH);
        const windows = new Array(Math.ceil(h / 20)).fill(false).map(() => Math.random() > 0.4);
        skyline.push({ x: bx, width: w, height: h, color: config.skylineColor, windows });
        bx += w - 5; // Slight overlap
    }

    const mailboxCount = Math.round(config.houseCount * config.mailboxRatio);

    return {
        canvasWidth, canvasHeight,
        currentLevel: level,
        levelConfig: config,
        levelPhase: 'playing',
        levelCompleteTimer: 0,
        cyclist: { x: getCyclistX(canvasWidth), y: getCyclistY(canvasHeight), pedalAngle: 0, armAngle: 0 },
        houses: [], newspapers: [], particles: [],
        score: 0, totalDeliveries: 0,
        perfectCount: 0, goodCount: 0, okCount: 0, missCount: 0,
        levelScore: 0, levelPerfect: 0, levelGood: 0, levelOk: 0, levelMiss: 0,
        levelMailboxCount: mailboxCount,
        isGameOver: false, frameCount: 0, groundOffset: 0,
        houseSpawnTimer: 50, housesDelivered: 0, currentHouseIndex: 0,
        lastThrowResult: null, throwResultTimer: 0,
        deliveryLog: [], speed: config.baseSpeed,
        cloudField: clouds,
        skyline,
        combo: 0, maxCombo: 0,
        perLevelScores: [],
        newspapersRemaining: mailboxCount + 1, // Bonus newspaper
        distanceTraveled: 0,
    };
}

export function resetForLevel(state: DeliveryState, level: number): void {
    const config = LEVELS[level];
    state.perLevelScores[state.currentLevel] = state.levelScore;

    state.currentLevel = level;
    state.levelConfig = config;
    state.levelPhase = 'playing';
    state.levelCompleteTimer = 0;
    state.houses = [];
    state.newspapers = [];
    state.particles = [];
    state.houseSpawnTimer = 50;
    state.housesDelivered = 0;
    state.currentHouseIndex = 0;
    state.speed = config.baseSpeed;
    state.lastThrowResult = null;
    state.throwResultTimer = 0;
    state.groundOffset = 0;
    state.levelScore = 0;
    state.levelPerfect = 0;
    state.levelGood = 0;
    state.levelOk = 0;
    state.levelMiss = 0;
    state.levelMailboxCount = Math.round(config.houseCount * config.mailboxRatio);
    state.combo = 0;
    state.newspapersRemaining = state.levelMailboxCount + 1; // Reset ammo
    state.distanceTraveled = 0;

    state.cloudField = [];
    for (let i = 0; i < 8; i++) {
        state.cloudField.push({
            x: Math.random() * state.canvasWidth,
            y: Math.random() * (state.canvasHeight * 0.18) + 10,
            width: 60 + Math.random() * 100,
            height: 14 + Math.random() * 18,
            speed: 0.15 + Math.random() * 0.3,
            opacity: 0.06 + Math.random() * 0.12,
        });
    }

    // Regenerate skyline
    state.skyline = [];
    let bx = 0;
    while (bx < state.canvasWidth + 200) {
        const w = 30 + Math.random() * 70;
        const h = config.skylineMinH + Math.random() * (config.skylineMaxH - config.skylineMinH);
        const windows = new Array(Math.ceil(h / 20)).fill(false).map(() => Math.random() > 0.4);
        state.skyline.push({ x: bx, width: w, height: h, color: config.skylineColor, windows });
        bx += w - 5;
    }
}

// ─── Helpers ───
let _mailboxSlots: boolean[] = [];
let _mailboxSlotsLevel = -1;

function generateMailboxSlots(houseCount: number, ratio: number): boolean[] {
    const totalMailbox = Math.round(houseCount * ratio);
    const slots = new Array(houseCount).fill(false);
    const spacing = houseCount / totalMailbox;
    for (let i = 0; i < totalMailbox; i++) {
        const idx = Math.min(Math.round(i * spacing + Math.random() * 1.5 - 0.75), houseCount - 1);
        slots[idx] = true;
    }
    let count = slots.filter(Boolean).length;
    while (count < totalMailbox) {
        const idx = Math.floor(Math.random() * houseCount);
        if (!slots[idx]) { slots[idx] = true; count++; }
    }
    while (count > totalMailbox) {
        const idx = Math.floor(Math.random() * houseCount);
        if (slots[idx]) { slots[idx] = false; count--; }
    }
    return slots;
}

// ─── Logic ───
export function throwNewspaper(state: DeliveryState): void {
    if (state.levelPhase !== 'playing') return;
    if (state.newspapersRemaining <= 0) return; // No ammo

    // Resume audio context on first interaction
    audio.init();

    state.newspapersRemaining--;
    state.cyclist.armAngle = -50;

    audio.playThrow();

    // Just spawn the newspaper - physics handling in update()
    state.newspapers.push({
        x: getCyclistX(state.canvasWidth) + 20,
        y: getCyclistY(state.canvasHeight) - 20,
        velocityX: THROW_VX,
        velocityY: THROW_VY,
        rotation: 0,
        active: true,
        landed: false,
        trail: [],
        age: 0,
    });
}

function checkLanding(state: DeliveryState, paper: Newspaper): void {
    const ch = state.canvasHeight;
    const targetY = getHouseBaseY(ch) + getTerrainOffset(paper.x, state);

    // If paper crossed the target height line AND is actually falling down
    if (paper.velocityY > 0 && paper.y >= targetY - 10 && !paper.landed) {
        paper.landed = true;
        paper.active = false; // Stop updating physics, but maybe keep for animation? Simpler to remove.

        // Find nearest mailbox house
        let bestDist = Infinity;
        let targetHouse: House | null = null;
        for (const h of state.houses) {
            if (!h.hasMailbox) continue;
            const mailboxWorldX = h.x + h.mailboxX;
            const dist = Math.abs(paper.x - mailboxWorldX);
            if (dist < bestDist) {
                bestDist = dist;
                targetHouse = h;
            }
        }

        const config = state.levelConfig;

        // Check if hit
        if (targetHouse && !targetHouse.delivered && bestDist < config.okZone) {
            // HIT!
            targetHouse.delivered = true;
            let tier: number, label: string, points: number, color: string;

            if (bestDist < config.perfectZone) {
                tier = 0; label = '★ PERFECT ★'; points = 100; color = '#00ff88';
                state.combo++;
            } else if (bestDist < config.goodZone) {
                tier = 1; label = 'GOOD!'; points = 50; color = '#00e5ff';
                state.combo++;
            } else {
                tier = 2; label = 'OK'; points = 10; color = '#ffdd57';
                state.combo = 0;
            }

            // Combo bonus
            if (state.combo >= 3 && tier <= 1) {
                const bonus = Math.min(state.combo - 2, 5) * 10;
                points += bonus;
                label += ` +${bonus}`;
                audio.playCombo();
            }
            state.maxCombo = Math.max(state.maxCombo, state.combo);

            state.score += points;
            state.levelScore += points;
            state.totalDeliveries++;
            state.housesDelivered++;

            if (tier === 0) { state.perfectCount++; state.levelPerfect++; }
            else if (tier === 1) { state.goodCount++; state.levelGood++; }
            else { state.okCount++; state.levelOk++; }

            audio.playHit(tier);

            state.lastThrowResult = { tier, label, points, color, x: targetHouse.x + targetHouse.mailboxX, y: targetY - 40 };
            state.throwResultTimer = 70;

            state.deliveryLog.push({
                houseId: targetHouse.houseId + state.currentLevel * 100,
                scoreTier: tier,
                cumulativeScore: state.score,
                deliveryNumber: state.totalDeliveries,
            });

            // Sparkles
            for (let i = 0; i < 12; i++) {
                state.particles.push({
                    x: targetHouse.x + targetHouse.mailboxX, y: targetY - 20,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -Math.random() * 5 - 2,
                    life: 30 + Math.random() * 20,
                    maxLife: 50,
                    color: i % 2 === 0 ? color : '#fff',
                    size: 2 + Math.random() * 3,
                });
            }

        } else {
            // MISS (landed but nothing hit)
            state.combo = 0;
            state.lastThrowResult = { tier: 3, label: 'MISS', points: 0, color: '#ff4757', x: paper.x, y: targetY - 20 };
            state.throwResultTimer = 40;

            audio.playMiss();

            // Dust particles
            for (let i = 0; i < 6; i++) {
                state.particles.push({
                    x: paper.x, y: targetY,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 2,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    color: '#888',
                    size: 2 + Math.random() * 2,
                });
            }
        }
    }
}

export function update(state: DeliveryState): void {
    if (state.isGameOver) return;

    const cw = state.canvasWidth;
    const ch = state.canvasHeight;
    const config = state.levelConfig;

    if (state.levelPhase === 'levelComplete') {
        state.levelCompleteTimer--;
        return;
    }

    state.frameCount++;

    // Speed ramp (slower)
    const progress = state.housesDelivered / state.levelMailboxCount;
    state.speed = config.baseSpeed + progress * (config.maxSpeed - config.baseSpeed);

    state.cyclist.pedalAngle += state.speed * 2.5;
    if (state.cyclist.armAngle < 0) state.cyclist.armAngle += 4;
    state.groundOffset = (state.groundOffset + state.speed) % 40;
    state.distanceTraveled += state.speed;

    // Subtle pedal tick every ~30 frames
    if (state.frameCount % 30 === 0) {
        audio.playPedalTick();
    }

    for (const c of state.cloudField) {
        c.x -= c.speed;
        if (c.x + c.width < 0) { c.x = cw + 20; c.y = Math.random() * (ch * 0.18) + 10; }
    }

    // Skyline parallax
    for (const b of state.skyline) {
        b.x -= state.speed * 0.1; // Very slow parallax
    }
    // Re-cycle buildings
    const firstB = state.skyline[0];
    if (firstB.x + firstB.width < -100) {
        state.skyline.shift();
        const lastB = state.skyline[state.skyline.length - 1];
        const w = 30 + Math.random() * 70;
        state.skyline.push({
            x: lastB ? lastB.x + lastB.width - 5 : cw,
            width: w,
            height: config.skylineMinH + Math.random() * (config.skylineMaxH - config.skylineMinH),
            color: config.skylineColor,
            windows: new Array(6).fill(false).map(() => Math.random() > 0.4)
        });
    }

    // Spawn Houses
    if (_mailboxSlotsLevel !== state.currentLevel) {
        _mailboxSlots = generateMailboxSlots(config.houseCount, config.mailboxRatio);
        _mailboxSlotsLevel = state.currentLevel;
    }

    state.houseSpawnTimer -= state.speed;
    if (state.houseSpawnTimer <= 0 && state.currentHouseIndex < config.houseCount) {
        const idx = state.currentHouseIndex;
        const levelPalettes = LEVEL_PALETTES[state.currentLevel] ?? LEVEL_PALETTES[0];
        const palette = levelPalettes[idx % levelPalettes.length];
        const w = 90 + Math.random() * 50;
        const h = (ch * 0.20) + Math.random() * (ch * 0.10);
        const roofStyles: ('triangle' | 'flat' | 'steep')[] = ['triangle', 'flat', 'steep'];

        let hasMailbox = _mailboxSlots[idx] ?? false;
        // Ensure last few houses satisfy delivery count if needed? 
        // No, `generateMailboxSlots` handles exact count.

        state.houses.push({
            x: cw + 30,
            width: w,
            height: h,
            color: palette.wall,
            roofColor: palette.roof,
            doorColor: palette.door,
            roofStyle: roofStyles[Math.floor(Math.random() * roofStyles.length)],
            hasMailbox,
            mailboxX: hasMailbox ? w * 0.15 + Math.random() * (w * 0.5) : w * 0.5,
            hasFence: Math.random() > 0.5,
            delivered: false,
            houseId: idx,
            windowRows: 1 + Math.floor(Math.random() * 2),
            windowCols: 2 + Math.floor(Math.random() * 2),
            hasChimney: Math.random() > 0.5,
            chimneyOffset: 0.2 + Math.random() * 0.5,
        });

        state.currentHouseIndex++;
        state.houseSpawnTimer = config.houseSpawnGap;
    }

    // Move houses
    for (const house of state.houses) house.x -= state.speed;

    // Check missed mailbox houses (scrolled off screen)
    const cyclistX = getCyclistX(cw);
    for (const house of state.houses) {
        // If it scrolls way past the cyclist and wasn't delivered...
        if (house.hasMailbox && !house.delivered && house.x + house.width < -100) {
            // Mark as missed silently for stats? Or just let it be.
            // Original code marked it. Let's mark it to ensure level ends.
            house.delivered = true; // effectively processed
            state.housesDelivered++; // count towards progress so level ends
            state.missCount++;
            state.levelMiss++;
            state.combo = 0;

            // Only play miss sound if it was a mailbox housing being missed
            audio.playMiss();

            state.deliveryLog.push({
                houseId: house.houseId + state.currentLevel * 100,
                scoreTier: 3, cumulativeScore: state.score, deliveryNumber: state.totalDeliveries,
            });
        }
    }
    state.houses = state.houses.filter(h => h.x + h.width > -200);

    // Update Newspapers
    for (const p of state.newspapers) {
        if (!p.active) continue;
        p.age++;
        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 10) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.82;

        p.x += p.velocityX;
        p.y += p.velocityY;
        p.velocityY += THROW_GRAVITY;
        p.rotation += 10;

        // Check landing logic
        checkLanding(state, p);

        // Cull if off screen
        if (p.x > cw + 100 || p.y > ch + 50) p.active = false;
    }
    state.newspapers = state.newspapers.filter(p => p.active);

    // Particles
    for (const p of state.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    if (state.throwResultTimer > 0) {
        state.throwResultTimer--;
        if (state.throwResultTimer <= 0) state.lastThrowResult = null;
    }

    // Level Complete
    // End when all mailboxes for the level are accounted for (delivered or missed)
    // AND all newspapers are gone (landed)
    if (state.housesDelivered >= state.levelMailboxCount && state.newspapers.length === 0 && state.levelPhase === 'playing') {
        state.perLevelScores[state.currentLevel] = state.levelScore;
        if (state.currentLevel >= LEVELS.length - 1) {
            state.levelPhase = 'allComplete';
            state.isGameOver = true;
            audio.playGameOver();
        } else {
            state.levelPhase = 'levelComplete';
            state.levelCompleteTimer = 150;
            audio.playLevelComplete();
        }
    } else if (state.newspapersRemaining <= 0 && state.newspapers.length === 0 && state.levelPhase === 'playing') {
        // Run out of ammo and no papers in air -> Game Over
        state.perLevelScores[state.currentLevel] = state.levelScore;
        state.levelPhase = 'failed';
        state.isGameOver = true;
        audio.playGameOver();
    }
}


function drawTerrainStrip(
    ctx: CanvasRenderingContext2D,
    cw: number,
    state: DeliveryState,
    topBaseY: number,
    botBaseY: number,
    fillStyle: CanvasFillStrokeStyles['fillStyle']
) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    // Top edge (left to right)
    for (let x = 0; x <= cw + 20; x += 20) {
        ctx.lineTo(x, topBaseY + getTerrainOffset(x, state));
    }
    ctx.lineTo(cw, botBaseY + getTerrainOffset(cw, state));
    // Bot edge (right to left)
    for (let x = cw; x >= -20; x -= 20) {
        ctx.lineTo(x, botBaseY + getTerrainOffset(x, state));
    }
    ctx.lineTo(0, topBaseY + getTerrainOffset(0, state));
    ctx.closePath();
    ctx.fill();
}

// ─── Render ───
export function render(ctx: CanvasRenderingContext2D, state: DeliveryState): void {
    const cw = state.canvasWidth;
    const ch = state.canvasHeight;
    const config = state.levelConfig;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, getSidewalkY(ch));
    skyGrad.addColorStop(0, config.skyGrad[0]);
    skyGrad.addColorStop(0.5, config.skyGrad[1]);
    skyGrad.addColorStop(1, config.skyGrad[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, getSidewalkY(ch));

    // City Skyline (Background)
    const skylineBase = getSidewalkY(ch) - 20;
    ctx.save();
    for (const b of state.skyline) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, skylineBase - b.height, b.width, b.height + 20);

        // Antenna/spire details on tall buildings (later levels)
        if (config.level >= 2 && b.height > config.skylineMaxH * 0.7) {
            ctx.fillStyle = b.color;
            const antennaX = b.x + b.width * 0.5;
            ctx.fillRect(antennaX - 1, skylineBase - b.height - 15, 2, 15);
            // Blinking light
            const blink = Math.sin(state.frameCount * 0.06 + b.x * 0.1) > 0.3;
            if (blink) {
                ctx.fillStyle = '#ff3333';
                ctx.beginPath();
                ctx.arc(antennaX, skylineBase - b.height - 16, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Windows on ALL levels with per-level colors
        ctx.fillStyle = config.skylineWindowColor;
        const windowCols = Math.max(1, Math.floor((b.width - 12) / 14));
        const windowRows = Math.max(1, Math.floor((b.height - 10) / 22));
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                const wIdx = row * windowCols + col;
                const lit = wIdx < b.windows.length ? b.windows[wIdx] : Math.random() > 0.5;
                if (lit) {
                    const wx = b.x + 6 + col * 14;
                    const wy = skylineBase - b.height + 8 + row * 22;
                    if (wy < skylineBase - 4) {
                        ctx.fillRect(wx, wy, 8, 14);
                    }
                }
            }
        }
    }
    ctx.restore();

    // Clouds
    for (const c of state.cloudField) {
        ctx.save();
        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(c.x + c.width * 0.3, c.y, c.width * 0.35, c.height * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.width * 0.6, c.y - c.height * 0.15, c.width * 0.3, c.height * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawTreeSilhouettes(ctx, state, cw, ch);

    // Ground (Grass behind sidewalk)
    const grassTop = getSidewalkY(ch) - 30;
    const roadTop = getRoadTopY(ch);
    const grassGrad = ctx.createLinearGradient(0, grassTop, 0, roadTop);
    grassGrad.addColorStop(0, config.grassGrad[0]);
    grassGrad.addColorStop(1, config.grassGrad[1]);
    drawTerrainStrip(ctx, cw, state, grassTop, getSidewalkY(ch), grassGrad);

    // Sidewalk
    drawTerrainStrip(ctx, cw, state, getSidewalkY(ch), roadTop, config.sidewalkColor);
    drawTerrainStrip(ctx, cw, state, getSidewalkY(ch), getSidewalkY(ch) + 2, config.curbColor); // Highlight

    // Curb strip between sidewalk and road
    drawTerrainStrip(ctx, cw, state, roadTop - 2, roadTop, config.curbColor);

    // Road
    const roadBot = getGroundY(ch);
    const roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadBot);
    roadGrad.addColorStop(0, config.roadGrad[0]);
    roadGrad.addColorStop(0.5, config.roadGrad[1]);
    roadGrad.addColorStop(1, config.roadGrad[2]);
    drawTerrainStrip(ctx, cw, state, roadTop, roadBot, roadGrad);

    drawTerrainStrip(ctx, cw, state, roadTop, roadTop + 3, config.curbColor); // Road top highlight

    // Road texture lines (subtle scrolling dashes across road surface for motion feel)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const roadH = roadBot - roadTop;
    for (let row = 0; row < 4; row++) {
        const lineY = roadTop + roadH * (0.2 + row * 0.2);
        ctx.setLineDash([4, 30 + row * 8]);
        ctx.lineDashOffset = -state.groundOffset * (1.5 + row * 0.3);
        ctx.beginPath();
        for (let x = 0; x <= cw + 20; x += 20) {
            const py = lineY + getTerrainOffset(x, state);
            if (x === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.stroke();
    }
    ctx.restore();

    // White edge line (top of road)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 30]);
    ctx.lineDashOffset = -state.groundOffset * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= cw + 20; x += 20) {
        const py = roadTop + 5 + getTerrainOffset(x, state);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.restore();

    // White edge line (bottom of road)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 30]);
    ctx.lineDashOffset = -state.groundOffset * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= cw + 20; x += 20) {
        const py = roadBot - 5 + getTerrainOffset(x, state);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.restore();

    // Center dashed line (brighter, thicker)
    ctx.save();
    ctx.strokeStyle = '#ffdd5760';
    ctx.lineWidth = 3;
    ctx.setLineDash([35, 25]);
    ctx.lineDashOffset = -state.groundOffset * 2.5;
    const centerY = (roadTop + roadBot) / 2;
    ctx.beginPath();
    for (let x = 0; x <= cw + 20; x += 20) {
        const py = centerY + getTerrainOffset(x, state);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.restore();

    // Road bottom highlight and bottom fill
    drawTerrainStrip(ctx, cw, state, roadBot - 2, roadBot, '#ffffff15');
    // Bottom fill below road down to screen bottom
    drawTerrainStrip(ctx, cw, state, roadBot, ch + 100, '#1a1a1e');

    for (const house of state.houses) drawHouse(ctx, house, state);
    for (const p of state.newspapers) drawNewspaper(ctx, p);

    for (const p of state.particles) {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawCyclist(ctx, state);

    if (state.lastThrowResult && state.throwResultTimer > 0) {
        const tr = state.lastThrowResult;
        const alpha = Math.min(state.throwResultTimer / 20, 1);
        const yOff = (70 - state.throwResultTimer) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = tr.color;
        ctx.shadowColor = tr.color;
        ctx.shadowBlur = 12;
        ctx.fillText(tr.label, tr.x, tr.y - yOff);
        if (tr.points > 0) {
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText(`+${tr.points}`, tr.x, tr.y - yOff + 18);
        }
        ctx.restore();
    }

    drawHUD(ctx, state);
    if (state.levelPhase === 'levelComplete') drawLevelComplete(ctx, state);
}

// ─── Sub-renderers ───
function drawTreeSilhouettes(ctx: CanvasRenderingContext2D, state: DeliveryState, cw: number, ch: number) {
    const baseY = getSidewalkY(ch) - 28;
    const offset = (state.groundOffset * 0.3) % 80;
    ctx.save();
    ctx.fillStyle = '#0a1a10';
    for (let x = -offset; x < cw + 60; x += 70) {
        const h = 30 + Math.sin(x * 0.04) * 15;
        const ty = baseY + getTerrainOffset(x, state);
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x + 15, ty - h);
        ctx.lineTo(x + 30, ty);
        ctx.fill();
    }
    ctx.fillStyle = '#0d2016';
    for (let x = -offset * 1.5 - 35; x < cw + 60; x += 55) {
        const h = 22 + Math.cos(x * 0.05) * 10;
        const ty = baseY + 2 + getTerrainOffset(x, state);
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x + 12, ty - h);
        ctx.lineTo(x + 24, ty);
        ctx.fill();
    }
    ctx.restore();
}

function drawHouse(ctx: CanvasRenderingContext2D, house: House, state: DeliveryState) {
    const ch = state.canvasHeight;
    const baseY = getHouseBaseY(ch) + getTerrainOffset(house.x + house.width / 2, state);
    const x = house.x;
    const w = house.width;
    const h = house.height;
    const wallTop = baseY - h;

    ctx.fillStyle = house.color;
    ctx.fillRect(x, wallTop, w, h);

    ctx.fillStyle = house.roofColor;
    if (house.roofStyle === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(x - 6, wallTop + 2);
        ctx.lineTo(x + w / 2, wallTop - 20);
        ctx.lineTo(x + w + 6, wallTop + 2);
        ctx.fill();
    } else if (house.roofStyle === 'steep') {
        ctx.beginPath();
        ctx.moveTo(x - 4, wallTop + 2);
        ctx.lineTo(x + w / 2, wallTop - 30);
        ctx.lineTo(x + w + 4, wallTop + 2);
        ctx.fill();
    } else {
        ctx.fillRect(x - 4, wallTop - 6, w + 8, 10);
    }

    if (house.hasChimney) {
        const cx = x + w * house.chimneyOffset;
        ctx.fillStyle = house.roofColor;
        ctx.fillRect(cx, wallTop - 28, 10, 20);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 1, wallTop - 30, 12, 4);
    }

    const windowW = 12, windowH = 14, windowStartY = wallTop + 14;
    const windowGapX = (w - 20) / (house.windowCols + 1);
    for (let row = 0; row < house.windowRows; row++) {
        for (let col = 0; col < house.windowCols; col++) {
            const wx = x + 10 + windowGapX * (col + 0.5);
            const wy = windowStartY + row * 24;
            ctx.fillStyle = '#1a1a28';
            ctx.fillRect(wx, wy, windowW, windowH);
            const glow = 0.3 + Math.sin(state.frameCount * 0.02 + col + row) * 0.15;
            ctx.fillStyle = `rgba(255, 200, 100, ${glow})`;
            ctx.fillRect(wx + 1, wy + 1, windowW - 2, windowH - 2);
        }
    }

    const doorW = 14, doorH = 24, doorX = x + w * 0.5 - doorW / 2, doorY = baseY - doorH;
    ctx.fillStyle = house.doorColor;
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#ccaa44';
    ctx.beginPath();
    ctx.arc(doorX + doorW - 4, doorY + doorH * 0.55, 2, 0, Math.PI * 2);
    ctx.fill();

    if (house.hasFence) {
        ctx.strokeStyle = '#5a5040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 4, baseY - 10);
        ctx.lineTo(x + w + 4, baseY - 10);
        ctx.stroke();
        for (let fx = x; fx < x + w + 4; fx += 12) {
            ctx.beginPath();
            ctx.moveTo(fx, baseY);
            ctx.lineTo(fx, baseY - 14);
            ctx.stroke();
        }
    }

    if (house.hasMailbox) {
        drawMailbox(ctx, x + house.mailboxX, baseY, house.delivered, state);

        // VISUAL HITBOX/TARGET RING (Enhanced)
        if (!house.delivered) {
            ctx.save();
            const pulse = 1 + Math.sin(state.frameCount * 0.12) * 0.2; // Slower, deeper pulse
            // Draw ring on ground/mailbox
            ctx.translate(x + house.mailboxX, baseY);
            ctx.scale(1, 0.4); // Isometric-ish ring

            // Outer Glow
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 3 + pulse; // Thicker line

            ctx.globalAlpha = 0.6 + Math.sin(state.frameCount * 0.2) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); // Larger radius (was 16)
            ctx.stroke();

            // Inner dot
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

function drawMailbox(ctx: CanvasRenderingContext2D, x: number, y: number, delivered: boolean, state: DeliveryState) {
    // Larger Mailbox Post
    ctx.fillStyle = '#5a5040';
    ctx.fillRect(x - 3, y - 28, 6, 28); // Thicker and taller post

    // Box
    ctx.fillStyle = delivered ? '#2a5a2a' : '#3a6aaa';
    ctx.beginPath();
    // Larger box shape
    ctx.moveTo(x - 10, y - 28);
    ctx.lineTo(x + 10, y - 28);
    ctx.lineTo(x + 10, y - 38);
    ctx.arc(x, y - 38, 10, 0, -Math.PI, true); // Larger arc (radius 10)
    ctx.closePath();
    ctx.fill();

    if (!delivered) {
        // Flag (Larger)
        const wave = Math.sin(state.frameCount * 0.08) * 2;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x + 10, y - 40 + wave, 8, 5); // Larger flag
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 28);
        ctx.lineTo(x + 10, y - 42 + wave);
        ctx.stroke();
    } else {
        ctx.save();
        ctx.font = '12px "Press Start 2P", monospace'; // Larger checkmark
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
        ctx.fillText('✓', x, y - 44);
        ctx.restore();
    }
}

function drawCyclist(ctx: CanvasRenderingContext2D, state: DeliveryState) {
    const x = state.cyclist.x, y = state.cyclist.y + getTerrainOffset(state.cyclist.x, state);
    ctx.save();

    // Lean forward based on speed
    const lean = 0.2 + (state.speed / state.levelConfig.maxSpeed) * 0.15;

    // Wheel animation
    const wheelRot = -(state.groundOffset / 40) * Math.PI * 2;

    const drawWheel = (wx: number, wy: number) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(wheelRot);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke(); // Tire
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.stroke();
            ctx.rotate(Math.PI / 4);
        }
        ctx.restore();
    };

    drawWheel(x - 18, y + 8); // Rear
    drawWheel(x + 22, y + 8); // Front

    // Frame
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 8); // Rear axle
    ctx.lineTo(x - 2, y - 8);  // Crank
    ctx.lineTo(x + 18, y - 16); // Handlebar mount
    ctx.lineTo(x + 22, y + 8);  // Front axle
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 18, y + 8);
    ctx.lineTo(x - 12, y - 18); // Seat post
    ctx.lineTo(x + 5, y - 18);  // Top tube
    ctx.lineTo(x + 18, y - 16);
    ctx.stroke();

    // Seat
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 20, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handlebars
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 18);
    ctx.lineTo(x + 14, y - 24);
    ctx.lineTo(x + 20, y - 24);
    ctx.stroke();

    // Rider
    // Legs
    const crankX = x - 2, crankY = y - 8;
    const pedalRad = state.cyclist.pedalAngle;
    const rightPedal = { x: crankX + Math.cos(pedalRad) * 6, y: crankY + Math.sin(pedalRad) * 6 };
    const leftPedal = { x: crankX + Math.cos(pedalRad + Math.PI) * 6, y: crankY + Math.sin(pedalRad + Math.PI) * 6 };
    const hip = { x: x - 12, y: y - 24 };

    // Function to draw leg (simple IK-ish)
    const drawLeg = (foot: { x: number, y: number }, color: string) => {
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.lineTo(hip.x + (foot.x - hip.x) * 0.5 + 2, hip.y + (foot.y - hip.y) * 0.5 - 5); // Knee sticking up/out
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();
    };

    drawLeg(leftPedal, '#1a3a5a'); // Left leg (back)

    // Body
    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.rotate(lean);
    ctx.fillStyle = '#2a4d7a'; // Jersey
    ctx.fillRect(0, -18, 10, 20); // Torso

    // Backpack
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-6, -16, 6, 14);

    // Head
    ctx.fillStyle = '#ffd5a0'; // Skin
    ctx.beginPath(); ctx.arc(5, -22, 5, 0, Math.PI * 2); ctx.fill();
    // Helmet
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(5, -24, 6, Math.PI, 0); ctx.fill();

    // Arm
    ctx.strokeStyle = '#ffd5a0'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(5, -14); // Shoulder
    const handX = 26; // Relative to torso due to rotation? No, need world coords.
    // Actually simpler to just draw arm forward
    ctx.lineTo(20, -5); // Hand
    ctx.stroke();

    ctx.restore();

    drawLeg(rightPedal, '#2a4d7a'); // Right leg (front)

    ctx.restore();
}

function drawNewspaper(ctx: CanvasRenderingContext2D, paper: Newspaper) {
    for (const t of paper.trail) {
        ctx.save(); ctx.globalAlpha = t.alpha * 0.35; ctx.fillStyle = '#f5f0e0';
        ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(paper.x, paper.y); ctx.rotate((paper.rotation * Math.PI) / 180);
    ctx.fillStyle = '#f5f0e0'; ctx.fillRect(-10, -4, 20, 8);
    ctx.fillStyle = '#cc3300'; ctx.fillRect(-10, -1, 20, 2);
    ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: DeliveryState) {
    const cw = state.canvasWidth;
    const config = state.levelConfig;
    ctx.save();

    // Panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
    roundRect(ctx, 10, 8, cw - 20, 50, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 10, 8, cw - 20, 50, 10);
    ctx.stroke();

    // Score
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`${state.score}`, 28, 40);

    // Level
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff9f43';
    ctx.fillText(`LV.${config.level + 1} ${config.name}`, cw / 2, 28);

    // Ammo / Progress
    const pct = state.housesDelivered / state.levelMailboxCount;
    const bw = 140, bh = 6, bx = cw / 2 - bw / 2, by = 38;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, bx, by, bw, bh, 3); ctx.fill();
    ctx.fillStyle = '#ff6b35'; roundRect(ctx, bx, by, bw * Math.min(pct, 1), bh, 3); ctx.fill();

    // Remaining Newspapers indicator
    ctx.textAlign = 'center';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = state.newspapersRemaining > 0 ? '#00ff88' : '#ff4757';
    ctx.fillText(`📰 x${state.newspapersRemaining}`, cw / 2 + 100, 35); // Next to progress bar

    // Stats
    ctx.textAlign = 'right'; const sx = cw - 28;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#00ff88'; ctx.fillText(`P:${state.levelPerfect}`, sx, 24);
    ctx.fillStyle = '#00e5ff'; ctx.fillText(`G:${state.levelGood}`, sx, 36);
    ctx.fillStyle = '#ffdd57'; ctx.fillText(`O:${state.levelOk}`, sx - 60, 24);
    ctx.fillStyle = '#ff4757'; ctx.fillText(`M:${state.levelMiss}`, sx - 60, 36);

    ctx.restore();
}

function drawLevelComplete(ctx: CanvasRenderingContext2D, state: DeliveryState) {
    const cw = state.canvasWidth;
    const ch = state.canvasHeight;
    const fade = Math.min((150 - state.levelCompleteTimer) / 30, 1);

    ctx.save();
    ctx.globalAlpha = fade * 0.7; ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = fade;

    const cwW = 420, cwH = 260, cx = cw / 2, cy = ch / 2;
    const cardX = (cw - cwW) / 2, cardY = (ch - cwH) / 2;

    ctx.fillStyle = 'rgba(18, 24, 50, 0.92)'; roundRect(ctx, cardX, cardY, cwW, cwH, 16); ctx.fill();
    ctx.strokeStyle = '#ff6b3540'; ctx.lineWidth = 1.5; roundRect(ctx, cardX, cardY, cwW, cwH, 16); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '14px "Press Start 2P", monospace'; ctx.fillStyle = '#ff6b35';
    ctx.fillText(`LV.${state.levelConfig.level + 1} COMPLETE!`, cx, cardY + 40);

    const maxPts = state.levelMailboxCount * 100;
    ctx.font = '22px "Press Start 2P", monospace'; ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${state.levelScore}`, cx, cardY + 106);
    ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#888';
    ctx.fillText(`/ ${maxPts}`, cx, cardY + 122);

    ctx.font = '9px "Press Start 2P", monospace'; ctx.fillStyle = '#fff';
    const pulse = 0.5 + Math.sin(state.frameCount * 0.06) * 0.3; ctx.globalAlpha = pulse;
    ctx.fillText('PRESS SPACE TO CONTINUE', cx, cardY + cwH - 20);

    ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
