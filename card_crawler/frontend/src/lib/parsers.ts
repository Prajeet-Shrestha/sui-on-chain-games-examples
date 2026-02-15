import type { GameSession, PlayerState, CardData } from './types';

// ═══════════════════════════════════════════════
// Parse GameSession from showContent fields
// ═══════════════════════════════════════════════

export function parseGameSession(fields: Record<string, any>): GameSession {
    return {
        id: fields.id?.id ?? '',
        state: Number(fields.state),
        player: String(fields.player),
        playerEntityId: fields.player_entity_id?.id ?? fields.player_entity_id ?? '',

        enemyHp: Number(fields.enemy_hp),
        enemyMaxHp: Number(fields.enemy_max_hp),
        enemyAtk: Number(fields.enemy_atk),
        enemyBaseAtk: Number(fields.enemy_base_atk),
        enemyType: Number(fields.enemy_type),
        block: Number(fields.block),
        turnCount: Number(fields.turn_count),

        atkBonus: Number(fields.atk_bonus),
        defBonus: Number(fields.def_bonus),
        regenAmount: Number(fields.regen_amount),
        thornsAmount: Number(fields.thorns_amount),
        furyBonus: Number(fields.fury_bonus),
        rampageCount: Number(fields.rampage_count),

        weakenStacks: Number(fields.weaken_stacks),
        weakenTurns: Number(fields.weaken_turns),
        poisonStacks: Number(fields.poison_stacks),

        floor: Number(fields.floor),
        nodeIndex: Number(fields.node_index),
        nodesCleared: Number(fields.nodes_cleared),
        nodesTotal: Number(fields.nodes_total),

        won: Boolean(fields.won),
    };
}

// ═══════════════════════════════════════════════
// Parse Card from dynamic field content
// ═══════════════════════════════════════════════

function parseCard(card: any): CardData {
    const f = card.fields ?? card;
    return {
        name: String(f.name),
        cost: Number(f.cost),
        cardType: Number(f.card_type),
        effectType: Number(f.effect_type),
        value: Number(f.value),
    };
}

// ═══════════════════════════════════════════════
// Parse Player Entity (with ECS components)
// ═══════════════════════════════════════════════

export function parsePlayerEntity(fields: Record<string, any>): PlayerState {
    // The Entity has components stored as dynamic fields.
    // With showContent=true, the ECS engine stores components in a bag.
    // We need to read components individually or parse from the entity fields.
    // The entity fields include a `components` bag — we'll read each component object.

    const id = fields.id?.id ?? '';

    // Components are in a Bag, accessed via dynamic fields.
    // For simplicity, we'll parse what we can from the content.
    // Entity fields from the engine: id, identity, position, components (Bag)
    // Components like Health, Energy etc. are stored as dynamic fields in the Bag.

    return {
        id,
        health: { current: 0, max: 0 },
        energy: { current: 0, max: 0, regen: 0 },
        gold: 0,
        deck: { drawPile: [], hand: [], discardPile: [] },
        relics: [],
    };
}

// ═══════════════════════════════════════════════
// Parse components fetched via getDynamicFields
// ═══════════════════════════════════════════════

export function parseHealthComponent(fields: Record<string, any>) {
    return {
        current: Number(fields.current),
        max: Number(fields.max),
    };
}

export function parseEnergyComponent(fields: Record<string, any>) {
    return {
        current: Number(fields.current),
        max: Number(fields.max),
        regen: Number(fields.regen),
    };
}

export function parseGoldComponent(fields: Record<string, any>) {
    return Number(fields.amount);
}

export function parseDeckComponent(fields: Record<string, any>) {
    const drawPile = (fields.draw_pile ?? []).map(parseCard);
    const hand = (fields.hand ?? []).map(parseCard);
    // Move struct uses "discard" not "discard_pile"
    const discardPile = (fields.discard ?? fields.discard_pile ?? []).map(parseCard);
    return { drawPile, hand, discardPile };
}

export function parseInventoryComponent(fields: Record<string, any>) {
    const items = (fields.items ?? []).map((item: any) => {
        const f = item.fields ?? item;
        return {
            itemType: Number(f.item_type),
            itemValue: Number(f.value),
        };
    });
    return items;
}

export { parseCard };
