/// Card Crawler — Solo roguelike deck-builder.
/// Fight through 3 floors, build your deck, defeat the Dragon boss.
/// Uses PTB-batched turns: draw + play + play + end_turn in ONE transaction.
#[allow(lint(public_random, public_entry), untyped_literal, unused_const)]
module card_crawler::game;

use std::ascii;
use sui::clock::Clock;
use sui::event;
use sui::random::Random;
use entity::entity::{Self, Entity};
use world::world::{Self, World};

// Components (read-only access for queries)
use components::health;
use components::energy;
use components::deck::{Self, CardData};
use components::gold;
use components::inventory;
use components::map_progress;

// ═══════════════════════════════════════════════
// ERROR CONSTANTS
// ═══════════════════════════════════════════════

const EWrongState: u64 = 100;
const ENotPlayer: u64 = 101;
const EInvalidNode: u64 = 102;
const EInvalidCardChoice: u64 = 103;
const EInvalidItemType: u64 = 104;
const ECombatNotOver: u64 = 105;
const EGameAlreadyStarted: u64 = 106;
const EFloorNotCleared: u64 = 107;
const EMaxRelics: u64 = 108;

// ═══════════════════════════════════════════════
// STATE CONSTANTS
// ═══════════════════════════════════════════════

const STATE_LOBBY: u8 = 0;
const STATE_MAP_SELECT: u8 = 1;
const STATE_COMBAT: u8 = 2;
const STATE_REWARD: u8 = 3;
const STATE_SHOP: u8 = 4;
const STATE_REST: u8 = 5;
const STATE_FINISHED: u8 = 6;

// ═══════════════════════════════════════════════
// CARD EFFECT CONSTANTS
// ═══════════════════════════════════════════════

// Attack effects (card_type = 0)
const FX_STRIKE: u8 = 0;       // deal value damage
const FX_BASH: u8 = 1;         // deal value damage (higher)
const FX_HEAVY_BLOW: u8 = 2;   // deal value damage (highest)
const FX_POISON_STAB: u8 = 3;  // deal 4 dmg + value poison stacks
const FX_WHIRLWIND: u8 = 4;    // deal value damage
const FX_RAMPAGE: u8 = 5;      // deal value + rampage_count * 4
const FX_EXECUTE: u8 = 6;      // deal value or 25 if enemy < 30%

// Skill effects (card_type = 1)
const FX_DEFEND: u8 = 0;       // gain value block
const FX_SHIELD_WALL: u8 = 1;  // gain value block (higher)
const FX_HEAL: u8 = 2;         // restore value HP
const FX_DODGE: u8 = 3;        // gain value block (free)
const FX_WEAKEN: u8 = 4;       // enemy ATK -value for 2 turns
const FX_ADRENALINE: u8 = 5;   // draw 2 cards + 1 energy

// Power effects (card_type = 2)
const FX_BERSERK: u8 = 0;      // +value ATK permanently
const FX_IRON_SKIN: u8 = 1;    // +value DEF permanently
const FX_REGEN: u8 = 2;        // heal value per turn
const FX_THORNS: u8 = 3;       // deal value to attacker when hit
const FX_FURY: u8 = 4;         // draw value extra cards per turn

// ═══════════════════════════════════════════════
// NODE TYPE CONSTANTS
// ═══════════════════════════════════════════════

const NODE_COMBAT: u8 = 0;
const NODE_ELITE: u8 = 1;
const NODE_SHOP: u8 = 2;
const NODE_REST: u8 = 3;
const NODE_BOSS: u8 = 4;

// ═══════════════════════════════════════════════
// RELIC CONSTANTS (stored as item_type in Inventory)
// ═══════════════════════════════════════════════

const RELIC_WHETSTONE: u8 = 0;      // +2 ATK
const RELIC_IRON_RING: u8 = 1;      // +2 DEF
const RELIC_ENERGY_POTION: u8 = 2;  // +1 energy/turn
const RELIC_HEALING_CRYSTAL: u8 = 3; // +5 HP after combat
const RELIC_LUCKY_COIN: u8 = 4;     // +15 gold from combat
const RELIC_THICK_SKIN: u8 = 5;     // +10 max HP

// ═══════════════════════════════════════════════
// GAME SESSION
// ═══════════════════════════════════════════════

public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    player_entity_id: ID,

    // Combat state
    enemy_hp: u64,
    enemy_max_hp: u64,
    enemy_atk: u64,
    enemy_base_atk: u64,
    enemy_type: u8,         // NODE_COMBAT / NODE_ELITE / NODE_BOSS
    block: u64,             // player block, resets each turn
    turn_count: u8,         // combat turn counter

    // Permanent bonuses (from powers + relics)
    atk_bonus: u64,
    def_bonus: u64,
    regen_amount: u64,      // HP healed per turn (Regen power)
    thorns_amount: u64,     // damage to attacker (Thorns power)
    fury_bonus: u64,        // extra cards drawn (Fury power)
    rampage_count: u64,     // Rampage stacking per combat

    // Weaken effect
    weaken_stacks: u64,     // enemy ATK reduction
    weaken_turns: u8,       // turns remaining

    // Poison on enemy
    poison_stacks: u64,     // damage per turn to enemy

    // Map
    floor: u8,
    node_index: u8,         // current node within floor
    nodes_cleared: u8,      // nodes cleared on this floor
    nodes_total: u8,        // total nodes on this floor

    // Result
    won: bool,
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

public struct RunStarted has copy, drop {
    session_id: ID,
    player: address,
}

public struct NodeChosen has copy, drop {
    session_id: ID,
    floor: u8,
    node: u8,
    node_type: u8,
}

public struct CombatStarted has copy, drop {
    session_id: ID,
    enemy_hp: u64,
    enemy_atk: u64,
    enemy_type: u8,
}

public struct CardEffect has copy, drop {
    session_id: ID,
    card_type: u8,
    effect_type: u8,
    value: u64,
}

public struct TurnEnded has copy, drop {
    session_id: ID,
    player_hp: u64,
    enemy_hp: u64,
    turn: u8,
}

public struct CombatWon has copy, drop {
    session_id: ID,
    gold_reward: u64,
    floor: u8,
}

public struct PlayerDied has copy, drop {
    session_id: ID,
    floor: u8,
    turn: u8,
}

public struct GameWon has copy, drop {
    session_id: ID,
    player: address,
}

public struct FloorAdvanced has copy, drop {
    session_id: ID,
    new_floor: u8,
}

// ═══════════════════════════════════════════════
// ENTRY FUNCTIONS
// ═══════════════════════════════════════════════

/// Create game world + session + player entity with starter deck.
public entry fun create_and_start(
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // 1. Create world
    let mut w = world::create_world(
        ascii::string(b"CardCrawler"),
        100,
        ctx,
    );

    // 2. Spawn player entity (only gets Position, Identity, Health, Team)
    let mut player = world::spawn_player(
        &mut w,
        ascii::string(b"Crawler"),
        0, 0,   // position (unused but required)
        80,     // max HP
        0,      // team
        clock,
        ctx,
    );

    // 3. Add Deck with starter cards
    let starter_deck = build_starter_deck();
    deck::add(&mut player, starter_deck);

    // 4. Add Energy (3 max, 3 regen = full refill each turn)
    energy::add(&mut player, energy::new(3, 3));

    // 5. Add Gold (starting 50)
    gold::add(&mut player, gold::new(50));

    // 6. Add Inventory for relics (capacity 3)
    inventory::add(&mut player, inventory::new(3));

    // 7. Add MapProgress
    map_progress::add(&mut player, map_progress::new());

    let player_id = object::id(&player);

    // 8. Create session
    let session = GameSession {
        id: object::new(ctx),
        state: STATE_MAP_SELECT,
        player: ctx.sender(),
        player_entity_id: player_id,
        enemy_hp: 0,
        enemy_max_hp: 0,
        enemy_atk: 0,
        enemy_base_atk: 0,
        enemy_type: 0,
        block: 0,
        turn_count: 0,
        atk_bonus: 0,
        def_bonus: 0,
        regen_amount: 0,
        thorns_amount: 0,
        fury_bonus: 0,
        rampage_count: 0,
        weaken_stacks: 0,
        weaken_turns: 0,
        poison_stacks: 0,
        floor: 1,
        node_index: 0,
        nodes_cleared: 0,
        nodes_total: 3,  // Floor 1 has 3 nodes
        won: false,
    };

    event::emit(RunStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
    });

    // Share everything
    world::share(w);
    entity::share(player);
    transfer::share_object(session);
}

/// Choose a map node on the current floor.
/// Floor 1: node 0=Combat(Goblin), node 1=Combat(Slime)/Rest, node 2=Shop
/// Floor 2: node 0=Combat(Skeleton), node 1=Elite(DarkKnight)/Combat(Orc), node 2=Shop
/// Floor 3: node 0=Boss(Dragon)
/// `path` selects between branching options (0 or 1) for nodes that branch.
public entry fun choose_node(
    session: &mut GameSession,
    path: u8,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_MAP_SELECT, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);

    let node = session.nodes_cleared;
    let floor = session.floor;
    let node_type = get_node_type(floor, node, path);

    session.node_index = node;

    event::emit(NodeChosen {
        session_id: object::id(session),
        floor,
        node,
        node_type,
    });

    if (node_type == NODE_COMBAT || node_type == NODE_ELITE || node_type == NODE_BOSS) {
        // Set up enemy
        let (hp, atk) = get_enemy_stats(floor, node, path);
        session.enemy_hp = hp;
        session.enemy_max_hp = hp;
        session.enemy_atk = atk;
        session.enemy_base_atk = atk;
        session.enemy_type = node_type;
        session.turn_count = 0;
        session.rampage_count = 0;
        session.poison_stacks = 0;
        session.weaken_stacks = 0;
        session.weaken_turns = 0;
        session.state = STATE_COMBAT;

        event::emit(CombatStarted {
            session_id: object::id(session),
            enemy_hp: hp,
            enemy_atk: atk,
            enemy_type: node_type,
        });
    } else if (node_type == NODE_SHOP) {
        session.state = STATE_SHOP;
    } else if (node_type == NODE_REST) {
        session.state = STATE_REST;
    };
}

/// Draw phase: reset block, regenerate energy, draw 5 cards (+ fury bonus).
/// Auto-reshuffles discard into draw pile if draw pile runs out mid-draw.
/// Should be the FIRST call in a combat PTB.
public entry fun draw_phase(
    world: &World,
    session: &mut GameSession,
    player: &mut Entity,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    // Reset block each turn
    session.block = 0;

    // Regenerate energy (restores to max)
    world::regenerate_energy(world, player);

    // Draw cards (auto-reshuffle if draw pile runs out)
    let draw_count = 5 + session.fury_bonus;
    draw_with_reshuffle(world, player, draw_count, r, ctx);
}

/// Play a card from hand. Costs energy. Applies effect.
/// Can be called multiple times in a PTB.
public entry fun play_card(
    world: &World,
    session: &mut GameSession,
    player: &mut Entity,
    hand_index: u64,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    // Engine handles energy check + discard, returns CardData
    let card = world::play_card(world, player, hand_index);

    // Apply game-specific effect
    apply_card_effect(world, session, player, &card);
}

/// End player turn: discard remaining hand, tick effects, enemy attacks.
/// Should be the LAST call in a combat PTB.
public entry fun end_player_turn(
    world: &World,
    session: &mut GameSession,
    player: &mut Entity,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    // 1. Discard remaining hand
    discard_hand(world, player);

    // 2. Tick poison on enemy
    if (session.poison_stacks > 0) {
        let poison_dmg = session.poison_stacks;
        if (poison_dmg >= session.enemy_hp) {
            session.enemy_hp = 0;
        } else {
            session.enemy_hp = session.enemy_hp - poison_dmg;
        };
        session.poison_stacks = session.poison_stacks - 1;
    };

    // 3. Tick regen on player
    if (session.regen_amount > 0) {
        let h = health::borrow_mut(player);
        h.heal(session.regen_amount);
    };

    // 4. Check if enemy died from poison
    if (session.enemy_hp == 0) {
        handle_combat_victory(session, player);
        // Shuffle for next combat
        world::shuffle_deck(world, player, r, ctx);
        return
    };

    // 5. Enemy attacks
    let mut enemy_dmg = session.enemy_atk;

    // Dark Knight: +2 ATK every 3 turns
    if (session.enemy_type == NODE_ELITE && session.turn_count > 0 && session.turn_count % 3 == 0) {
        session.enemy_atk = session.enemy_atk + 2;
    };

    // Dragon: +3 ATK every turn
    if (session.enemy_type == NODE_BOSS) {
        session.enemy_atk = session.enemy_atk + 3;
    };

    // Apply weaken
    if (session.weaken_turns > 0) {
        if (session.weaken_stacks >= enemy_dmg) {
            enemy_dmg = 0;
        } else {
            enemy_dmg = enemy_dmg - session.weaken_stacks;
        };
        session.weaken_turns = session.weaken_turns - 1;
    };

    // Apply block
    if (session.block >= enemy_dmg) {
        enemy_dmg = 0;
    } else {
        enemy_dmg = enemy_dmg - session.block;
    };

    // Apply DEF
    if (session.def_bonus >= enemy_dmg) {
        enemy_dmg = 0;
    } else {
        enemy_dmg = enemy_dmg - session.def_bonus;
    };

    // Deal damage to player
    if (enemy_dmg > 0) {
        let h = health::borrow_mut(player);
        h.take_damage(enemy_dmg);

        // Thorns: damage back to enemy
        if (session.thorns_amount > 0) {
            if (session.thorns_amount >= session.enemy_hp) {
                session.enemy_hp = 0;
            } else {
                session.enemy_hp = session.enemy_hp - session.thorns_amount;
            };
        };
    };

    session.turn_count = session.turn_count + 1;

    // 6. Check outcomes
    let player_hp = health::borrow(player).current();

    event::emit(TurnEnded {
        session_id: object::id(session),
        player_hp,
        enemy_hp: session.enemy_hp,
        turn: session.turn_count,
    });

    if (player_hp == 0) {
        // Player died
        session.state = STATE_FINISHED;
        session.won = false;
        event::emit(PlayerDied {
            session_id: object::id(session),
            floor: session.floor,
            turn: session.turn_count,
        });
    } else if (session.enemy_hp == 0) {
        // Enemy died (from thorns)
        handle_combat_victory(session, player);
        world::shuffle_deck(world, player, r, ctx);
    };
    // Otherwise: combat continues, player draws again next turn
}

/// Collect a card reward after combat. `card_choice` is 0-2 for the 3 options, or 3 to skip.
public entry fun collect_reward(
    session: &mut GameSession,
    player: &mut Entity,
    card_choice: u8,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_REWARD, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);

    if (card_choice < 3) {
        let card = get_reward_card(session.floor, card_choice);
        let d = deck::borrow_mut(player);
        d.add_to_draw_pile(card);
    };
    // card_choice == 3 means skip

    session.nodes_cleared = session.nodes_cleared + 1;
    session.state = STATE_MAP_SELECT;
}

/// Buy a card or remove a card at the shop.
/// `item_type`: 0=buy card, 1=remove card
/// `item_id`: for buy=card index in shop pool, for remove=draw pile index
public entry fun shop_action(
    session: &mut GameSession,
    player: &mut Entity,
    item_type: u8,
    item_id: u64,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_SHOP, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);

    if (item_type == 0) {
        // Buy card (60 gold)
        assert!(item_id < 15, EInvalidCardChoice);
        let card = get_shop_card(item_id);
        let g = gold::borrow_mut(player);
        g.spend(60);
        let d = deck::borrow_mut(player);
        d.add_to_draw_pile(card);
    } else if (item_type == 1) {
        // Remove card (50 gold)
        let g = gold::borrow_mut(player);
        g.spend(50);
        let d = deck::borrow_mut(player);
        let _ = d.remove_from_draw_pile(item_id);
    } else if (item_type == 2) {
        // Buy relic (100 gold)
        let inv = inventory::borrow(player);
        assert!(!inv.is_full(), EMaxRelics);
        let g = gold::borrow_mut(player);
        g.spend(100);
        let relic_type = (item_id as u8);
        let relic_value = get_relic_value(relic_type);
        let inv_mut = inventory::borrow_mut(player);
        inv_mut.add_item(inventory::new_item(relic_type, relic_value));

        // Apply immediate relic effects
        apply_relic_on_acquire(session, player, relic_type, relic_value);
    } else {
        abort EInvalidItemType
    };
}

/// Leave the shop.
public entry fun shop_done(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_SHOP, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);

    session.nodes_cleared = session.nodes_cleared + 1;
    session.state = STATE_MAP_SELECT;
}

/// Rest at a campfire: heal 30% of max HP.
public entry fun rest(
    session: &mut GameSession,
    player: &mut Entity,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_REST, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);

    let h_ref = health::borrow(player);
    let max_hp = h_ref.max();
    let heal_amount = max_hp * 30 / 100;

    let h = health::borrow_mut(player);
    h.heal(heal_amount);

    session.nodes_cleared = session.nodes_cleared + 1;
    session.state = STATE_MAP_SELECT;
}

/// Advance to the next floor after clearing all nodes on current floor.
public entry fun advance_floor(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_MAP_SELECT, EWrongState);
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.nodes_cleared >= session.nodes_total, EFloorNotCleared);

    session.floor = session.floor + 1;
    session.nodes_cleared = 0;
    session.node_index = 0;

    // Set nodes per floor
    if (session.floor == 2) {
        session.nodes_total = 3;
    } else if (session.floor == 3) {
        session.nodes_total = 1; // Boss only
    } else {
        session.nodes_total = 3;
    };

    event::emit(FloorAdvanced {
        session_id: object::id(session),
        new_floor: session.floor,
    });
}

// ═══════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════

/// Build the starter deck: 5 Strikes, 4 Defends, 1 Bash.
fun build_starter_deck(): deck::Deck {
    let mut cards = vector[];

    // 5 Strikes
    let mut i = 0;
    while (i < 5) {
        cards.push_back(deck::new_card(
            ascii::string(b"Strike"), 1, 0, FX_STRIKE, 6,
        ));
        i = i + 1;
    };

    // 4 Defends
    i = 0;
    while (i < 4) {
        cards.push_back(deck::new_card(
            ascii::string(b"Defend"), 1, 1, FX_DEFEND, 5,
        ));
        i = i + 1;
    };

    // 1 Bash
    cards.push_back(deck::new_card(
        ascii::string(b"Bash"), 2, 0, FX_BASH, 10,
    ));

    deck::new(cards)
}

/// Apply a card's effect based on its type and effect_type.
fun apply_card_effect(
    world: &World,
    session: &mut GameSession,
    player: &mut Entity,
    card: &CardData,
) {
    let card_type = deck::card_type(card);
    let effect = deck::card_effect_type(card);
    let value = deck::card_value(card);

    event::emit(CardEffect {
        session_id: object::id(session),
        card_type,
        effect_type: effect,
        value,
    });

    if (card_type == 0) {
        // ATTACK cards
        let mut dmg = value + session.atk_bonus;

        // Relic: Whetstone (+2 ATK to attacks)
        dmg = dmg + get_relic_atk_bonus(player);

        if (effect == FX_RAMPAGE) {
            dmg = dmg + session.rampage_count * 4;
            session.rampage_count = session.rampage_count + 1;
        } else if (effect == FX_EXECUTE) {
            // Deal 25 if enemy below 30% HP
            if (session.enemy_hp * 100 / session.enemy_max_hp < 30) {
                dmg = 25 + session.atk_bonus + get_relic_atk_bonus(player);
            };
        } else if (effect == FX_POISON_STAB) {
            // Poison stab: deal 4 + apply value as poison
            session.poison_stacks = session.poison_stacks + value;
            dmg = 4 + session.atk_bonus + get_relic_atk_bonus(player);
        };

        // Apply damage to enemy
        if (dmg >= session.enemy_hp) {
            session.enemy_hp = 0;
        } else {
            session.enemy_hp = session.enemy_hp - dmg;
        };
    } else if (card_type == 1) {
        // SKILL cards
        if (effect == FX_DEFEND || effect == FX_SHIELD_WALL || effect == FX_DODGE) {
            session.block = session.block + value;
        } else if (effect == FX_HEAL) {
            let h = health::borrow_mut(player);
            h.heal(value);
        } else if (effect == FX_WEAKEN) {
            session.weaken_stacks = value;
            session.weaken_turns = 2;
        } else if (effect == FX_ADRENALINE) {
            // Draw 2 extra cards
            world::draw_cards(world, player, 2);
            // Gain 1 energy
            let e = energy::borrow_mut(player);
            let current = e.current();
            e.set_current(current + 1);
        };
    } else if (card_type == 2) {
        // POWER cards (permanent)
        if (effect == FX_BERSERK) {
            session.atk_bonus = session.atk_bonus + value;
        } else if (effect == FX_IRON_SKIN) {
            session.def_bonus = session.def_bonus + value;
        } else if (effect == FX_REGEN) {
            session.regen_amount = session.regen_amount + value;
        } else if (effect == FX_THORNS) {
            session.thorns_amount = session.thorns_amount + value;
        } else if (effect == FX_FURY) {
            session.fury_bonus = session.fury_bonus + value;
        };
    };
}

/// Discard all remaining cards in hand.
fun discard_hand(world: &World, player: &mut Entity) {
    let mut hand_size = deck::borrow(player).hand_size();
    while (hand_size > 0) {
        world::discard_card(world, player, 0);
        hand_size = hand_size - 1;
    };
}

/// Draw `count` cards, auto-reshuffling discard into draw pile if needed.
/// Follows Slay the Spire convention: if draw pile runs out mid-draw,
/// shuffle discard back in and continue drawing the remainder.
fun draw_with_reshuffle(
    world: &World,
    player: &mut Entity,
    count: u64,
    r: &Random,
    ctx: &mut TxContext,
) {
    let drawn = world::draw_cards(world, player, count);
    if (drawn < count) {
        let remaining = count - drawn;
        let discard_size = deck::borrow(player).discard_size();
        if (discard_size > 0) {
            world::shuffle_deck(world, player, r, ctx);
            world::draw_cards(world, player, remaining);
        };
    };
}

/// Handle combat victory: grant gold, transition to REWARD or FINISHED.
fun handle_combat_victory(session: &mut GameSession, player: &mut Entity) {
    let gold_reward = get_gold_reward(session.floor, session.enemy_type);

    // Lucky Coin relic bonus
    let bonus = get_relic_gold_bonus(player);
    let total = gold_reward + bonus;

    let g = gold::borrow_mut(player);
    g.earn(total);

    // Healing Crystal relic
    let heal = get_relic_heal_bonus(player);
    if (heal > 0) {
        let h = health::borrow_mut(player);
        h.heal(heal);
    };

    event::emit(CombatWon {
        session_id: object::id(session),
        gold_reward: total,
        floor: session.floor,
    });

    if (session.enemy_type == NODE_BOSS) {
        // Beat the boss — GAME WON!
        session.state = STATE_FINISHED;
        session.won = true;
        event::emit(GameWon {
            session_id: object::id(session),
            player: session.player,
        });
    } else {
        session.state = STATE_REWARD;
    };
}

/// Get the node type for a given floor/node/path combination.
fun get_node_type(floor: u8, node: u8, path: u8): u8 {
    if (floor == 1) {
        if (node == 0) { NODE_COMBAT }                              // Goblin
        else if (node == 1) {
            if (path == 0) { NODE_COMBAT } else { NODE_REST }      // Slime or Rest
        }
        else { NODE_SHOP }
    } else if (floor == 2) {
        if (node == 0) { NODE_COMBAT }                              // Skeleton
        else if (node == 1) {
            if (path == 0) { NODE_ELITE } else { NODE_COMBAT }     // Dark Knight or Orc
        }
        else { NODE_SHOP }
    } else {
        NODE_BOSS                                                    // Dragon
    }
}

/// Get enemy stats (HP, ATK) for a given floor/node/path.
fun get_enemy_stats(floor: u8, node: u8, path: u8): (u64, u64) {
    if (floor == 1) {
        if (node == 0) { (20, 5) }        // Goblin
        else { (30, 4) }                   // Slime
    } else if (floor == 2) {
        if (node == 0) { (40, 8) }         // Skeleton
        else if (node == 1) {
            if (path == 0) { (60, 12) }    // Dark Knight (Elite)
            else { (50, 7) }               // Orc
        }
        else { (40, 8) }                   // fallback
    } else {
        (100, 15)                           // Dragon (Boss)
    }
}

/// Get gold reward based on floor and enemy type.
fun get_gold_reward(floor: u8, enemy_type: u8): u64 {
    if (enemy_type == NODE_BOSS) { 0 }  // Boss gives no gold, gives win
    else if (enemy_type == NODE_ELITE) { 50 }
    else if (floor == 1) { 22 }
    else { 32 }
}

/// Get a reward card by choice index (0-2). Cards vary by floor.
fun get_reward_card(floor: u8, choice: u8): CardData {
    if (floor == 1) {
        if (choice == 0) {
            deck::new_card(ascii::string(b"Heavy Blow"), 2, 0, FX_HEAVY_BLOW, 14)
        } else if (choice == 1) {
            deck::new_card(ascii::string(b"Poison Stab"), 1, 0, FX_POISON_STAB, 3)
        } else {
            deck::new_card(ascii::string(b"Heal"), 1, 1, FX_HEAL, 8)
        }
    } else {
        if (choice == 0) {
            deck::new_card(ascii::string(b"Execute"), 2, 0, FX_EXECUTE, 10)
        } else if (choice == 1) {
            deck::new_card(ascii::string(b"Shield Wall"), 2, 1, FX_SHIELD_WALL, 12)
        } else {
            deck::new_card(ascii::string(b"Berserk"), 2, 2, FX_BERSERK, 3)
        }
    }
}

/// Get a shop card by index (selecting from full pool).
fun get_shop_card(index: u64): CardData {
    if (index == 0) { deck::new_card(ascii::string(b"Heavy Blow"), 2, 0, FX_HEAVY_BLOW, 14) }
    else if (index == 1) { deck::new_card(ascii::string(b"Poison Stab"), 1, 0, FX_POISON_STAB, 3) }
    else if (index == 2) { deck::new_card(ascii::string(b"Whirlwind"), 1, 0, FX_WHIRLWIND, 5) }
    else if (index == 3) { deck::new_card(ascii::string(b"Rampage"), 1, 0, FX_RAMPAGE, 8) }
    else if (index == 4) { deck::new_card(ascii::string(b"Execute"), 2, 0, FX_EXECUTE, 10) }
    else if (index == 5) { deck::new_card(ascii::string(b"Shield Wall"), 2, 1, FX_SHIELD_WALL, 12) }
    else if (index == 6) { deck::new_card(ascii::string(b"Heal"), 1, 1, FX_HEAL, 8) }
    else if (index == 7) { deck::new_card(ascii::string(b"Dodge"), 0, 1, FX_DODGE, 3) }
    else if (index == 8) { deck::new_card(ascii::string(b"Weaken"), 1, 1, FX_WEAKEN, 3) }
    else if (index == 9) { deck::new_card(ascii::string(b"Adrenaline"), 0, 1, FX_ADRENALINE, 0) }
    else if (index == 10) { deck::new_card(ascii::string(b"Berserk"), 2, 2, FX_BERSERK, 3) }
    else if (index == 11) { deck::new_card(ascii::string(b"Iron Skin"), 2, 2, FX_IRON_SKIN, 3) }
    else if (index == 12) { deck::new_card(ascii::string(b"Regeneration"), 2, 2, FX_REGEN, 2) }
    else if (index == 13) { deck::new_card(ascii::string(b"Thorns"), 1, 2, FX_THORNS, 3) }
    else { deck::new_card(ascii::string(b"Fury"), 2, 2, FX_FURY, 1) }
}

/// Get relic value by type.
fun get_relic_value(relic_type: u8): u64 {
    if (relic_type == RELIC_WHETSTONE) { 2 }
    else if (relic_type == RELIC_IRON_RING) { 2 }
    else if (relic_type == RELIC_ENERGY_POTION) { 1 }
    else if (relic_type == RELIC_HEALING_CRYSTAL) { 5 }
    else if (relic_type == RELIC_LUCKY_COIN) { 15 }
    else { 10 } // THICK_SKIN
}

/// Apply one-time effects when acquiring a relic.
fun apply_relic_on_acquire(session: &mut GameSession, player: &mut Entity, relic_type: u8, value: u64) {
    if (relic_type == RELIC_IRON_RING) {
        session.def_bonus = session.def_bonus + value;
    } else if (relic_type == RELIC_ENERGY_POTION) {
        let e = energy::borrow_mut(player);
        let new_max = e.max() + (value as u8);
        e.set_max(new_max);
    } else if (relic_type == RELIC_THICK_SKIN) {
        let h = health::borrow_mut(player);
        let new_max = h.max() + value;
        h.set_max(new_max);
        h.heal(value);
    };
    // Whetstone, Healing Crystal, Lucky Coin are checked dynamically
}

/// Get ATK bonus from Whetstone relic (checked during attacks).
fun get_relic_atk_bonus(player: &Entity): u64 {
    let inv = inventory::borrow(player);
    let items = inv.items();
    let mut bonus: u64 = 0;
    let mut i = 0;
    let len = items.length();
    while (i < len) {
        let item = items.borrow(i);
        if (inventory::item_type(item) == RELIC_WHETSTONE) {
            bonus = bonus + inventory::item_value(item);
        };
        i = i + 1;
    };
    bonus
}

/// Get gold bonus from Lucky Coin relic.
fun get_relic_gold_bonus(player: &Entity): u64 {
    let inv = inventory::borrow(player);
    let items = inv.items();
    let mut bonus: u64 = 0;
    let mut i = 0;
    let len = items.length();
    while (i < len) {
        let item = items.borrow(i);
        if (inventory::item_type(item) == RELIC_LUCKY_COIN) {
            bonus = bonus + inventory::item_value(item);
        };
        i = i + 1;
    };
    bonus
}

/// Get heal bonus from Healing Crystal relic (after combat).
fun get_relic_heal_bonus(player: &Entity): u64 {
    let inv = inventory::borrow(player);
    let items = inv.items();
    let mut bonus: u64 = 0;
    let mut i = 0;
    let len = items.length();
    while (i < len) {
        let item = items.borrow(i);
        if (inventory::item_type(item) == RELIC_HEALING_CRYSTAL) {
            bonus = bonus + inventory::item_value(item);
        };
        i = i + 1;
    };
    bonus
}

// ═══════════════════════════════════════════════
// READ-ONLY GETTERS (for frontend)
// ═══════════════════════════════════════════════

public fun state(s: &GameSession): u8 { s.state }
public fun player(s: &GameSession): address { s.player }
public fun floor(s: &GameSession): u8 { s.floor }
public fun enemy_hp(s: &GameSession): u64 { s.enemy_hp }
public fun enemy_atk(s: &GameSession): u64 { s.enemy_atk }
public fun block(s: &GameSession): u64 { s.block }
public fun atk_bonus(s: &GameSession): u64 { s.atk_bonus }
public fun def_bonus(s: &GameSession): u64 { s.def_bonus }
public fun won(s: &GameSession): bool { s.won }
public fun nodes_cleared(s: &GameSession): u8 { s.nodes_cleared }
public fun nodes_total(s: &GameSession): u8 { s.nodes_total }
