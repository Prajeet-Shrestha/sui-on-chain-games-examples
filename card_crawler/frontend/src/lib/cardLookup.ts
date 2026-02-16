import cardData from '../data/cards.json';

const base = import.meta.env.BASE_URL;

interface CardLookupResult {
    imageUrl: string;
    cardTypeName: string;
    description: string;
    value: number;
}

interface EnemyLookupResult {
    imageUrl: string;
    nodeType: string;
    floor: number;
    name: string;
}

interface RelicLookupResult {
    imageUrl: string;
    effect: string;
    shopCost: number;
}

// Build lookup maps from cards.json
const allPlayableCards = [
    ...cardData.starterCards,
    ...cardData.attackCards,
    ...cardData.skillCards,
    ...cardData.powerCards,
];

const cardsByName = new Map<string, typeof allPlayableCards[0]>();
for (const c of allPlayableCards) {
    cardsByName.set(c.name, c);
}

const enemiesByName = new Map<string, (typeof cardData.enemies)[0]>();
for (const e of cardData.enemies) {
    enemiesByName.set(e.name, e);
}

const relicsByName = new Map<string, (typeof cardData.relics)[0]>();
for (const r of cardData.relics) {
    relicsByName.set(r.name, r);
}

/**
 * Look up a playable card by name → image, type, description
 */
export function lookupCard(name: string): CardLookupResult | null {
    const card = cardsByName.get(name);
    if (!card) return null;
    return {
        imageUrl: `${base}${card.url.replace(/^\//, '')}`,
        cardTypeName: card.cardTypeName,
        description: card.stats.description,
        value: card.stats.value,
    };
}

/**
 * Look up an enemy by name → image, nodeType, floor
 */
export function lookupEnemy(name: string): EnemyLookupResult | null {
    const enemy = enemiesByName.get(name);
    if (!enemy) return null;
    return {
        imageUrl: `${base}${enemy.url.replace(/^\//, '')}`,
        nodeType: enemy.nodeType,
        floor: enemy.floor,
        name: enemy.name,
    };
}

/**
 * Look up an enemy by matching (maxHp, atk) stats from the session.
 * Each enemy has unique stat combos so this reliably identifies them.
 */
export function lookupEnemyByStats(maxHp: number, atk: number): EnemyLookupResult | null {
    const enemy = cardData.enemies.find(
        (e) => e.stats.hp === maxHp && e.stats.atk === atk
    );
    if (!enemy) return null;
    return {
        imageUrl: `${base}${enemy.url.replace(/^\//, '')}`,
        nodeType: enemy.nodeType,
        floor: enemy.floor,
        name: enemy.name,
    };
}

/**
 * Look up a relic by name → image, effect, cost
 */
export function lookupRelic(name: string): RelicLookupResult | null {
    const relic = relicsByName.get(name);
    if (!relic) return null;
    return {
        imageUrl: `${base}${relic.url.replace(/^\//, '')}`,
        effect: relic.stats.effect,
        shopCost: relic.stats.shopCost,
    };
}

/**
 * Get the player character image URL
 */
export function getPlayerImageUrl(): string {
    return `${base}${cardData.player.url.replace(/^\//, '')}`;
}
