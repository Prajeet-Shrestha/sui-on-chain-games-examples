// ═══ Deploy IDs — fill after `sui client publish` ═══
export const PACKAGE_ID = '0x52ea5144008654c73591923fdfbb45ec5bbc1f07a1c339aca5ddfc7547c87d6c';
export const WORLD_ID = '0x096c7bbd40997e3235150e5cf0643439cf780e2f90e1d182d6968c912f8cb0af';
export const TAVERN_ID = '0x33d7eb09541ae0389e6caad0668e0c2b8e9a7535c4de22da200c4f5078ddd158';
export const CLOCK_ID = '0x6';

// ═══ Game State Machine ═══
export const STATE_LOBBY = 0;
export const STATE_PLACEMENT = 1;
export const STATE_COMBAT = 2;
export const STATE_FINISHED = 3;

export const STATE_LABELS: Record<number, string> = {
    [STATE_LOBBY]: 'Lobby',
    [STATE_PLACEMENT]: 'Placement',
    [STATE_COMBAT]: 'Combat',
    [STATE_FINISHED]: 'Finished',
};

// ═══ Unit Classes ═══
export const CLASS_SOLDIER = 0;
export const CLASS_ARCHER = 1;
export const CLASS_MAGE = 2;
export const CLASS_KNIGHT = 3;
export const CLASS_HEALER = 4;
export const CLASS_NINJA = 5;

export interface ClassInfo {
    id: number;
    name: string;
    hp: number;
    atk: number;
    def: number;
    range: number;
    speed: number;
    element: number;
    cost: number;
    special: string;
}

export const CLASSES: ClassInfo[] = [
    { id: 0, name: 'Soldier', hp: 100, atk: 15, def: 10, range: 1, speed: 3, element: 0, cost: 75, special: 'Shield Wall (+5 DEF, 2 turns)' },
    { id: 1, name: 'Archer', hp: 70, atk: 18, def: 5, range: 4, speed: 3, element: 1, cost: 85, special: 'Rain of Arrows (AOE, not impl)' },
    { id: 2, name: 'Mage', hp: 60, atk: 22, def: 3, range: 3, speed: 2, element: 2, cost: 100, special: 'Fireball (1.5× ATK, range 3)' },
    { id: 3, name: 'Knight', hp: 120, atk: 12, def: 15, range: 1, speed: 2, element: 3, cost: 110, special: 'Holy Strike (ignores DEF)' },
    { id: 4, name: 'Healer', hp: 65, atk: 8, def: 6, range: 3, speed: 3, element: 1, cost: 90, special: 'Heal (restore 30 HP to ally)' },
    { id: 5, name: 'Ninja', hp: 75, atk: 20, def: 4, range: 1, speed: 5, element: 0, cost: 130, special: 'Backstab (2× ATK)' },
];

// ═══ Portraits ═══
const base = import.meta.env.BASE_URL;
export const CLASS_PORTRAITS: string[] = [
    `${base}assets/portraits/soldier.png`,
    `${base}assets/portraits/archer.png`,
    `${base}assets/portraits/wizard.png`,
    `${base}assets/portraits/knight.png`,
    `${base}assets/portraits/cleric.png`,
    `${base}assets/portraits/ninja.png`,
];

// ═══ Sprites (full-body, fallback to portrait if empty) ═══
export const CLASS_SPRITES: string[] = [
    `${base}assets/sprites/soldier.png`,
    `${base}assets/sprites/archer.png`,
    `${base}assets/sprites/wizard.png`,
    `${base}assets/sprites/knight.png`,
    `${base}assets/sprites/cleric.png`,
    `${base}assets/sprites/ninja.png`,
];

// ═══ Elements ═══
export const ELEM_FIRE = 0;
export const ELEM_WATER = 1;
export const ELEM_EARTH = 2;
export const ELEM_WIND = 3;

export const ELEMENT_NAMES = ['Fire', 'Water', 'Earth', 'Wind'];
export const ELEMENT_EMOJI = ['🔥', '💧', '🪨', '🌪️'];

// ═══ AP Costs ═══
export const AP_PER_TURN = 3;
export const AP_MOVE = 1;
export const AP_ATTACK = 2;
export const AP_SPECIAL = 3;

// ═══ Error Code Map ═══
export const ERROR_MAP: Record<number, string> = {
    100: 'Not the owner of this roster',
    101: 'Not enough gold',
    102: 'Roster is full (max 6 units)',
    103: 'Already in a battle',
    104: 'No units in roster',
    105: 'Wrong game state for this action',
    106: 'Session is full',
    107: 'Invalid placement zone',
    108: 'Cell is occupied',
    109: 'Not your turn',
    110: 'Not enough action points',
    111: 'Target out of range',
    112: 'Unit is dead',
    113: 'Too many units for this session',
    114: 'Invalid target',
    115: 'Invalid class selection',
    116: 'Unit not in your army',
    117: 'Rewards already claimed',
};
