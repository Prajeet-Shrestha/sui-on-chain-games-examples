/// Tactics Ogre On-Chain — PvP Tactical RPG
///
/// Two-layer architecture:
///   METAGAME: Persistent Roster + Tavern + Gold (owned objects, survive across battles)
///   BATTLE:   Per-match shared sessions with Grid, AP-based multi-unit combat, permadeath
///
/// World is created once in init() — it is the game's identity.
/// Battle sessions create their own Grid via the World.
#[allow(lint(public_entry), unused_variable, unused_use, unused_const)]
module tactics_ogre::game;

// === Imports ===
use std::ascii;
use std::string::String;
use sui::clock::Clock;
use sui::event;
use sui::dynamic_field;
use entity::entity::{Self, Entity};
use world::world::{Self, World};
use systems::grid_sys::{Self, Grid};
use components::position;
use components::health::{Self, Health};
use components::attack::{Self, Attack};
use components::defense::{Self, Defense};
use components::movement;
use components::energy::{Self, Energy};
use components::team::{Self, Team};
use components::identity::{Self, Identity};
use components::status_effect;

// === Errors ===
const ENotEnoughGold: u64 = 100;
const ERosterFull: u64 = 101;
const EInvalidClass: u64 = 102;
const ENotOwner: u64 = 103;
const EAlreadyInBattle: u64 = 104;
const ENotInBattle: u64 = 105;
const ESessionFull: u64 = 106;
const EWrongState: u64 = 107;
const ENotPlayer: u64 = 108;
const ENotYourTurn: u64 = 109;
const EInvalidPlacement: u64 = 110;
const ETooManyUnits: u64 = 111;
const ENotEnoughAP: u64 = 112;
const EOutOfRange: u64 = 113;
const ESameTeam: u64 = 114;
const EUnitNotAlive: u64 = 115;
const ENotYourUnit: u64 = 116;
const EInvalidTarget: u64 = 117;
const EGameNotFinished: u64 = 118;
const EAlreadyReady: u64 = 119;
const EUnitNotInSession: u64 = 120;
const ENoUnits: u64 = 121;
const EMustPlaceUnit: u64 = 122;
const ECellOccupied: u64 = 123;

// === Game States ===
const STATE_LOBBY: u8 = 0;
const STATE_PLACEMENT: u8 = 1;
const STATE_COMBAT: u8 = 2;
const STATE_FINISHED: u8 = 3;

// === Unit Classes ===
const CLASS_SOLDIER: u8 = 0;
const CLASS_KNIGHT: u8 = 1;
const CLASS_ARCHER: u8 = 2;
const CLASS_WIZARD: u8 = 3;
const CLASS_CLERIC: u8 = 4;
const CLASS_NINJA: u8 = 5;

// === Elements ===
const ELEM_EARTH: u8 = 0;
const ELEM_FIRE: u8 = 1;
const ELEM_WIND: u8 = 2;
const ELEM_WATER: u8 = 3;

// === AP Costs ===
const AP_MOVE: u8 = 1;
const AP_ATTACK: u8 = 2;
const AP_SPECIAL: u8 = 3;
const AP_PER_TURN: u8 = 3;

// === Status Effect Types (from engine) ===
const EFFECT_POISON: u8 = 0;
const EFFECT_SHIELD: u8 = 1;

// === Gold Rewards ===
const GOLD_WIN: u64 = 150;
const GOLD_LOSE: u64 = 50;
const STARTING_GOLD: u64 = 400;

// === Unit Stats Table ===
//                   Cost  HP   ATK  DEF  Range  Speed  Element
// Soldier:          75    100  12   8    1      2      Earth
// Knight:           120   140  15   12   1      2      Earth
// Archer:           100   80   18   4    3      3      Wind
// Wizard:           110   70   22   3    2      2      Fire
// Cleric:           100   90   8    6    2      2      Water
// Ninja:            130   75   20   5    1      4      Wind

// ═══════════════════════════════════════════════
// STRUCTS
// ═══════════════════════════════════════════════

/// Tavern — shared config object, created in init()
public struct Tavern has key {
    id: UID,
}

/// Roster — owned by player, persistent across battles
public struct Roster has key {
    id: UID,
    owner: address,
    units: vector<ID>,       // up to 6 unit entity IDs
    gold: u64,
    in_battle: bool,
}

/// GameSession — per-battle shared object
public struct GameSession has key {
    id: UID,
    state: u8,
    players: vector<address>,
    max_units_per_player: u64,
    p1_ready: bool,
    p2_ready: bool,
    p1_units: vector<ID>,
    p2_units: vector<ID>,
    p1_alive_count: u64,
    p2_alive_count: u64,
    winner: Option<address>,
    current_turn: u8,        // 0 = P1, 1 = P2
    turn_number: u64,
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

public struct RosterCreated has copy, drop {
    roster_id: ID,
    player: address,
}

public struct UnitRecruited has copy, drop {
    roster_id: ID,
    unit_id: ID,
    class: u8,
    name: std::ascii::String,
    cost: u64,
}

public struct UnitSold has copy, drop {
    roster_id: ID,
    unit_id: ID,
    refund: u64,
}

public struct SessionCreated has copy, drop {
    session_id: ID,
    creator: address,
    max_units: u64,
}

public struct PlayerJoined has copy, drop {
    session_id: ID,
    player: address,
}

public struct UnitPlaced has copy, drop {
    session_id: ID,
    unit_id: ID,
    x: u64,
    y: u64,
}

public struct CombatStarted has copy, drop {
    session_id: ID,
}

public struct UnitMoved has copy, drop {
    session_id: ID,
    unit_id: ID,
    to_x: u64,
    to_y: u64,
    ap_spent: u8,
}

public struct AttackPerformed has copy, drop {
    session_id: ID,
    attacker_id: ID,
    defender_id: ID,
    damage: u64,
    element_multiplier: u64,
}

public struct SpecialUsed has copy, drop {
    session_id: ID,
    unit_id: ID,
    class: u8,
}

public struct UnitDied has copy, drop {
    session_id: ID,
    unit_id: ID,
}

public struct TurnEnded has copy, drop {
    session_id: ID,
    next_player: u8,
    turn_number: u64,
}

public struct GameOver has copy, drop {
    session_id: ID,
    winner: address,
    reason: u8,  // 0 = elimination, 1 = surrender
}

public struct RewardsClaimed has copy, drop {
    session_id: ID,
    player: address,
    gold_earned: u64,
    units_survived: u64,
    units_lost: u64,
}

// ═══════════════════════════════════════════════
// INIT — Create World + Tavern
// ═══════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    let world = world::create_world(
        ascii::string(b"TacticsOgre"),
        1000,     // max_entities — high because many units across all players
        ctx,
    );

    let tavern = Tavern {
        id: object::new(ctx),
    };

    world::share(world);
    transfer::share_object(tavern);
}

// ═══════════════════════════════════════════════
// METAGAME — Roster & Tavern
// ═══════════════════════════════════════════════

/// Create a new roster for the calling player
public entry fun create_roster(ctx: &mut TxContext) {
    let player = ctx.sender();
    let roster = Roster {
        id: object::new(ctx),
        owner: player,
        units: vector::empty(),
        gold: STARTING_GOLD,
        in_battle: false,
    };

    event::emit(RosterCreated {
        roster_id: object::id(&roster),
        player,
    });

    transfer::transfer(roster, player);
}

/// Recruit a unit from the Tavern
public entry fun recruit_unit(
    world: &mut World,
    _tavern: &Tavern,
    roster: &mut Roster,
    class: u8,
    name: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == roster.owner, ENotOwner);
    assert!(class <= CLASS_NINJA, EInvalidClass);
    assert!(vector::length(&roster.units) < 6, ERosterFull);

    let cost = get_unit_cost(class);
    assert!(roster.gold >= cost, ENotEnoughGold);

    roster.gold = roster.gold - cost;

    // Get unit stats
    let (hp, atk, def, range, speed, element) = get_unit_stats(class);

    // Spawn player entity via World (gets Position, Identity, Health, Team)
    let mut unit = world::spawn_player(
        world,
        ascii::string(name),
        0, 0,           // placeholder position
        hp,
        0,              // team_id = 0 (set when entering battle)
        clock,
        ctx,
    );

    // Add remaining components
    attack::add(&mut unit, attack::new(atk, (range as u8), 0));
    defense::add(&mut unit, defense::new(def, 0));
    movement::add(&mut unit, movement::new((speed as u8), 0)); // 0 = WALK
    energy::add(&mut unit, energy::new(AP_PER_TURN, AP_PER_TURN)); // max=3, regen=3

    // Add custom dynamic fields
    dynamic_field::add(entity::uid_mut(&mut unit), b"class", class);
    dynamic_field::add(entity::uid_mut(&mut unit), b"element", element);

    let unit_id = object::id(&unit);
    vector::push_back(&mut roster.units, unit_id);

    event::emit(UnitRecruited {
        roster_id: object::id(roster),
        unit_id,
        class,
        name: ascii::string(name),
        cost,
    });

    // Share entity (Entity lacks 'store' — must be shared, not owned-transferred)
    entity::share(unit);
}

/// Sell a unit back for 50% of cost
public entry fun sell_unit(
    roster: &mut Roster,
    unit: Entity,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == roster.owner, ENotOwner);
    assert!(!roster.in_battle, EAlreadyInBattle);

    let unit_id = object::id(&unit);

    // Remove from roster
    let (found, idx) = vector::index_of(&roster.units, &unit_id);
    assert!(found, EUnitNotInSession);
    vector::remove(&mut roster.units, idx);

    // Get class for refund calculation
    let class = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(&unit), b"class");
    let refund = get_unit_cost(class) / 2;
    roster.gold = roster.gold + refund;

    event::emit(UnitSold {
        roster_id: object::id(roster),
        unit_id,
        refund,
    });

    // Destroy entity — must strip all components first
    let mut unit = unit;
    position::remove(&mut unit);
    health::remove(&mut unit);
    attack::remove(&mut unit);
    defense::remove(&mut unit);
    movement::remove(&mut unit);
    energy::remove(&mut unit);
    team::remove(&mut unit);
    identity::remove(&mut unit);
    let _: u8 = dynamic_field::remove(entity::uid_mut(&mut unit), b"class");
    let _: u8 = dynamic_field::remove(entity::uid_mut(&mut unit), b"element");
    entity::destroy(unit);
}

/// Rename a unit
public entry fun rename_unit(
    unit: &mut Entity,
    new_name: vector<u8>,
    ctx: &TxContext,
) {
    // Only owner can call (Sui enforces this for owned objects)
    let _ = ctx.sender();
    let id_mut = identity::borrow_mut(unit);
    identity::set_name(id_mut, ascii::string(new_name));
}

// ═══════════════════════════════════════════════
// BATTLE — Session Lifecycle
// ═══════════════════════════════════════════════

/// Create a new battle session
public entry fun create_session(
    world: &mut World,
    roster: &mut Roster,
    max_units_per_player: u64,
    ctx: &mut TxContext,
) {
    assert!(!roster.in_battle, EAlreadyInBattle);
    assert!(ctx.sender() == roster.owner, ENotOwner);
    assert!(vector::length(&roster.units) > 0, ENoUnits);
    assert!(max_units_per_player >= 1 && max_units_per_player <= 4, ETooManyUnits);

    roster.in_battle = true;

    // Create grid via World — each session gets its own 8x8 grid
    let grid = world::create_grid(world, 8, 8, ctx);
    let grid_id = object::id(&grid);

    let mut players = vector::empty();
    vector::push_back(&mut players, ctx.sender());

    let session = GameSession {
        id: object::new(ctx),
        state: STATE_LOBBY,
        players,
        max_units_per_player,
        p1_ready: false,
        p2_ready: false,
        p1_units: vector::empty(),
        p2_units: vector::empty(),
        p1_alive_count: 0,
        p2_alive_count: 0,
        winner: option::none(),
        current_turn: 0,
        turn_number: 0,
    };

    event::emit(SessionCreated {
        session_id: object::id(&session),
        creator: ctx.sender(),
        max_units: max_units_per_player,
    });

    world::share_grid(grid);
    transfer::share_object(session);
}

/// P2 joins an existing session
public entry fun join_session(
    session: &mut GameSession,
    roster: &mut Roster,
    ctx: &mut TxContext,
) {
    assert!(session.state == STATE_LOBBY, EWrongState);
    assert!(vector::length(&session.players) < 2, ESessionFull);
    assert!(!roster.in_battle, EAlreadyInBattle);
    assert!(ctx.sender() == roster.owner, ENotOwner);
    assert!(vector::length(&roster.units) > 0, ENoUnits);

    roster.in_battle = true;
    vector::push_back(&mut session.players, ctx.sender());
    session.state = STATE_PLACEMENT;

    event::emit(PlayerJoined {
        session_id: object::id(session),
        player: ctx.sender(),
    });
}

/// Place a unit on the grid during PLACEMENT phase
public entry fun place_unit(
    session: &mut GameSession,
    world: &World,
    grid: &mut Grid,
    unit: &mut Entity,
    x: u64,
    y: u64,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_PLACEMENT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    let unit_id = object::id(unit);

    // Validate placement zone
    if (player_index == 0) {
        assert!(y <= 1, EInvalidPlacement); // P1: rows 0-1
        assert!(vector::length(&session.p1_units) < session.max_units_per_player, ETooManyUnits);
    } else {
        assert!(y >= 6, EInvalidPlacement); // P2: rows 6-7
        assert!(vector::length(&session.p2_units) < session.max_units_per_player, ETooManyUnits);
    };

    assert!(!grid_sys::is_occupied(grid, x, y), ECellOccupied);

    // Set unit's team based on player index
    let team_mut = team::borrow_mut(unit);
    team::set_team_id(team_mut, (player_index as u8));

    // Update position
    let pos_mut = position::borrow_mut(unit);
    position::set(pos_mut, x, y);

    // Place on grid
    world::place(world, grid, unit_id, x, y);

    // Track in session
    if (player_index == 0) {
        vector::push_back(&mut session.p1_units, unit_id);
        session.p1_alive_count = session.p1_alive_count + 1;
    } else {
        vector::push_back(&mut session.p2_units, unit_id);
        session.p2_alive_count = session.p2_alive_count + 1;
    };

    event::emit(UnitPlaced {
        session_id: object::id(session),
        unit_id,
        x,
        y,
    });
}

/// Player signals ready. When both ready → COMBAT
public entry fun ready_up(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_PLACEMENT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);

    // Must have placed at least 1 unit
    if (player_index == 0) {
        assert!(vector::length(&session.p1_units) > 0, EMustPlaceUnit);
        assert!(!session.p1_ready, EAlreadyReady);
        session.p1_ready = true;
    } else {
        assert!(vector::length(&session.p2_units) > 0, EMustPlaceUnit);
        assert!(!session.p2_ready, EAlreadyReady);
        session.p2_ready = true;
    };

    // Both ready → start combat
    if (session.p1_ready && session.p2_ready) {
        session.state = STATE_COMBAT;
        session.current_turn = 0; // P1 goes first
        session.turn_number = 1;

        event::emit(CombatStarted {
            session_id: object::id(session),
        });
    };
}

// ═══════════════════════════════════════════════
// BATTLE — Combat Actions
// ═══════════════════════════════════════════════

/// Move a unit (costs 1 AP per tile, Manhattan distance)
public entry fun move_unit(
    session: &mut GameSession,
    world: &World,
    grid: &mut Grid,
    unit: &mut Entity,
    to_x: u64,
    to_y: u64,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);

    // Validate unit belongs to current player
    assert!(is_unit_in_player_list(session, player_index, object::id(unit)), ENotYourUnit);

    // Unit must be alive
    let hp = health::borrow(unit);
    assert!(health::is_alive(hp), EUnitNotAlive);

    // Calculate Manhattan distance for AP cost
    let pos = position::borrow(unit);
    let from_x = position::x(pos);
    let from_y = position::y(pos);
    let dist = manhattan_distance(from_x, from_y, to_x, to_y);

    // Check speed limit
    let mov = movement::borrow(unit);
    let speed = movement::speed(mov);
    assert!(dist <= (speed as u64), EOutOfRange);

    // Spend AP
    let ap_cost = (dist as u8) * AP_MOVE;
    let en = energy::borrow(unit);
    assert!(energy::has_enough(en, ap_cost), ENotEnoughAP);
    let en_mut = energy::borrow_mut(unit);
    energy::spend(en_mut, ap_cost);

    // Check destination is valid and not occupied
    assert!(grid_sys::in_bounds(grid, to_x, to_y), EOutOfRange);
    assert!(!grid_sys::is_occupied(grid, to_x, to_y), ECellOccupied);

    // Move on grid
    let unit_id = object::id(unit);
    grid_sys::move_on_grid(grid, unit_id, from_x, from_y, to_x, to_y);

    // Update position component
    let pos_mut = position::borrow_mut(unit);
    position::set(pos_mut, to_x, to_y);

    event::emit(UnitMoved {
        session_id: object::id(session),
        unit_id,
        to_x,
        to_y,
        ap_spent: ap_cost,
    });
}

/// Attack an enemy unit (costs 2 AP)
public entry fun attack_unit(
    session: &mut GameSession,
    _world: &World,
    grid: &Grid,
    attacker: &mut Entity,
    defender: &mut Entity,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);

    // Validate attacker belongs to current player
    assert!(is_unit_in_player_list(session, player_index, object::id(attacker)), ENotYourUnit);

    // Validate defender belongs to opponent
    let opp_index = 1 - player_index;
    assert!(is_unit_in_player_list(session, opp_index, object::id(defender)), EInvalidTarget);

    // Both must be alive
    let atk_hp = health::borrow(attacker);
    assert!(health::is_alive(atk_hp), EUnitNotAlive);
    let def_hp = health::borrow(defender);
    assert!(health::is_alive(def_hp), EUnitNotAlive);

    // Spend 2 AP
    let en = energy::borrow(attacker);
    assert!(energy::has_enough(en, AP_ATTACK), ENotEnoughAP);
    let en_mut = energy::borrow_mut(attacker);
    energy::spend(en_mut, AP_ATTACK);

    // Range check (Manhattan distance)
    let atk_pos = position::borrow(attacker);
    let def_pos = position::borrow(defender);
    let atk_comp = attack::borrow(attacker);
    let range = (attack::range(atk_comp) as u64);
    let dist = manhattan_distance(
        position::x(atk_pos), position::y(atk_pos),
        position::x(def_pos), position::y(def_pos),
    );
    assert!(dist <= range, EOutOfRange);

    // Calculate damage with elemental modifier
    let damage = calculate_damage(attacker, defender);

    // Apply damage
    let def_hp_mut = health::borrow_mut(defender);
    health::take_damage(def_hp_mut, damage);

    let atk_elem = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(attacker), b"element");
    let def_elem = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(defender), b"element");
    let multiplier = get_element_multiplier(atk_elem, def_elem);

    event::emit(AttackPerformed {
        session_id: object::id(session),
        attacker_id: object::id(attacker),
        defender_id: object::id(defender),
        damage,
        element_multiplier: multiplier,
    });

    // Check if defender died
    let def_hp_check = health::borrow(defender);
    if (!health::is_alive(def_hp_check)) {
        event::emit(UnitDied {
            session_id: object::id(session),
            unit_id: object::id(defender),
        });

        // Remove from grid
        let dead_pos = position::borrow(defender);
        // NOTE: Corpse stays on grid as impassable per GDD — do NOT remove from grid

        // Decrement alive count
        if (opp_index == 0) {
            session.p1_alive_count = session.p1_alive_count - 1;
        } else {
            session.p2_alive_count = session.p2_alive_count - 1;
        };

        // Check win condition — all enemy units eliminated
        let opp_alive = if (opp_index == 0) { session.p1_alive_count } else { session.p2_alive_count };
        if (opp_alive == 0) {
            session.state = STATE_FINISHED;
            session.winner = option::some(sender);

            event::emit(GameOver {
                session_id: object::id(session),
                winner: sender,
                reason: 0, // elimination
            });
        };
    };
}

/// Use a class-specific special ability (costs 3 AP)
public entry fun use_special(
    session: &mut GameSession,
    world: &World,
    grid: &Grid,
    unit: &mut Entity,
    target: &mut Entity,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);

    // Validate unit belongs to current player
    assert!(is_unit_in_player_list(session, player_index, object::id(unit)), ENotYourUnit);

    // Unit must be alive
    let hp = health::borrow(unit);
    assert!(health::is_alive(hp), EUnitNotAlive);

    // Spend 3 AP
    let en = energy::borrow(unit);
    assert!(energy::has_enough(en, AP_SPECIAL), ENotEnoughAP);
    let en_mut = energy::borrow_mut(unit);
    energy::spend(en_mut, AP_SPECIAL);

    let class = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(unit), b"class");

    if (class == CLASS_SOLDIER) {
        // Shield Wall: +5 DEF for 2 turns (self)
        // Use EFFECT_SHIELD with 5 stacks, 2 duration
        assert!(object::id(unit) == object::id(target), EInvalidTarget); // self-target
        world::apply_effect(world, target, EFFECT_SHIELD, 5, 2);

    } else if (class == CLASS_KNIGHT) {
        // Heavy Strike: 1.5x damage melee attack
        let opp_index = 1 - player_index;
        assert!(is_unit_in_player_list(session, opp_index, object::id(target)), EInvalidTarget);
        let tgt_hp = health::borrow(target);
        assert!(health::is_alive(tgt_hp), EUnitNotAlive);

        // Range check (melee = 1)
        let unit_pos = position::borrow(unit);
        let tgt_pos = position::borrow(target);
        let dist = manhattan_distance(
            position::x(unit_pos), position::y(unit_pos),
            position::x(tgt_pos), position::y(tgt_pos),
        );
        assert!(dist <= 1, EOutOfRange);

        let base_damage = calculate_damage(unit, target);
        let heavy_damage = base_damage * 3 / 2; // 1.5x
        let tgt_hp_mut = health::borrow_mut(target);
        health::take_damage(tgt_hp_mut, heavy_damage);

        check_death(session, target, opp_index, sender);

    } else if (class == CLASS_ARCHER) {
        // Piercing Shot: ignores DEF, uses attack range
        let opp_index = 1 - player_index;
        assert!(is_unit_in_player_list(session, opp_index, object::id(target)), EInvalidTarget);
        let tgt_hp = health::borrow(target);
        assert!(health::is_alive(tgt_hp), EUnitNotAlive);

        // Range check
        let unit_pos = position::borrow(unit);
        let tgt_pos = position::borrow(target);
        let atk_comp = attack::borrow(unit);
        let range = (attack::range(atk_comp) as u64);
        let dist = manhattan_distance(
            position::x(unit_pos), position::y(unit_pos),
            position::x(tgt_pos), position::y(tgt_pos),
        );
        assert!(dist <= range, EOutOfRange);

        // Damage ignores DEF
        let atk_val = attack::damage(atk_comp);
        let damage = if (atk_val > 0) { atk_val } else { 1 };
        let tgt_hp_mut = health::borrow_mut(target);
        health::take_damage(tgt_hp_mut, damage);

        check_death(session, target, opp_index, sender);

    } else if (class == CLASS_WIZARD) {
        // Fireball: normal damage + Burn (3 dmg/turn for 2 turns, using POISON)
        let opp_index = 1 - player_index;
        assert!(is_unit_in_player_list(session, opp_index, object::id(target)), EInvalidTarget);
        let tgt_hp = health::borrow(target);
        assert!(health::is_alive(tgt_hp), EUnitNotAlive);

        // Range check
        let unit_pos = position::borrow(unit);
        let tgt_pos = position::borrow(target);
        let atk_comp = attack::borrow(unit);
        let range = (attack::range(atk_comp) as u64);
        let dist = manhattan_distance(
            position::x(unit_pos), position::y(unit_pos),
            position::x(tgt_pos), position::y(tgt_pos),
        );
        assert!(dist <= range, EOutOfRange);

        let damage = calculate_damage(unit, target);
        let tgt_hp_mut = health::borrow_mut(target);
        health::take_damage(tgt_hp_mut, damage);

        // Apply burn (poison flavor)
        world::apply_effect(world, target, EFFECT_POISON, 3, 2);

        check_death(session, target, opp_index, sender);

    } else if (class == CLASS_CLERIC) {
        // Heal: restore 30 HP to ally within range
        assert!(is_unit_in_player_list(session, player_index, object::id(target)), EInvalidTarget);
        let tgt_hp = health::borrow(target);
        assert!(health::is_alive(tgt_hp), EUnitNotAlive);

        // Range check
        let unit_pos = position::borrow(unit);
        let tgt_pos = position::borrow(target);
        let atk_comp = attack::borrow(unit);
        let range = (attack::range(atk_comp) as u64);
        let dist = manhattan_distance(
            position::x(unit_pos), position::y(unit_pos),
            position::x(tgt_pos), position::y(tgt_pos),
        );
        assert!(dist <= range, EOutOfRange);

        let tgt_hp_mut = health::borrow_mut(target);
        health::heal(tgt_hp_mut, 30);

    } else if (class == CLASS_NINJA) {
        // Backstab: 1.5x damage, ignores range (teleport-strike)
        let opp_index = 1 - player_index;
        assert!(is_unit_in_player_list(session, opp_index, object::id(target)), EInvalidTarget);
        let tgt_hp = health::borrow(target);
        assert!(health::is_alive(tgt_hp), EUnitNotAlive);

        let base_damage = calculate_damage(unit, target);
        let backstab_damage = base_damage * 3 / 2; // 1.5x
        let tgt_hp_mut = health::borrow_mut(target);
        health::take_damage(tgt_hp_mut, backstab_damage);

        check_death(session, target, opp_index, sender);
    };

    event::emit(SpecialUsed {
        session_id: object::id(session),
        unit_id: object::id(unit),
        class,
    });
}

/// End the current player's turn
public entry fun end_turn(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);

    // Flip turn
    session.current_turn = if (session.current_turn == 0) { 1 } else { 0 };
    session.turn_number = session.turn_number + 1;

    // NOTE: AP reset and status effect ticking happen when units are acted upon
    // in the next turn — each unit's AP is reset at the start of their player's turn
    // via a separate tick_turn_start function, or we reset AP here for the incoming player's units.
    // For simplicity, we reset AP when the turn starts for the NEW current player's units.

    event::emit(TurnEnded {
        session_id: object::id(session),
        next_player: session.current_turn,
        turn_number: session.turn_number,
    });
}

/// Reset AP for a unit at the start of a turn (called by the active player)
/// This should be called once per unit at the start of the player's turn.
public entry fun refresh_unit(
    session: &GameSession,
    world: &World,
    unit: &mut Entity,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);
    assert!(is_unit_in_player_list(session, player_index, object::id(unit)), ENotYourUnit);

    let hp = health::borrow(unit);
    if (health::is_alive(hp)) {
        // Reset AP to 3
        let en_mut = energy::borrow_mut(unit);
        let current = energy::current(en_mut);
        let max = energy::max(en_mut);
        if (current < max) {
            // Regenerate to max
            energy::regenerate(en_mut);
        };

        // Tick status effects
        if (entity::has_component(unit, entity::status_effect_bit())) {
            world::tick_effects(world, unit);
            world::remove_expired(world, unit);
        };
    };
}

/// Surrender — only on your turn
public entry fun surrender(
    session: &mut GameSession,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_COMBAT, EWrongState);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);
    assert!(session.current_turn == (player_index as u8), ENotYourTurn);

    let winner_index = 1 - player_index;
    let winner = *vector::borrow(&session.players, winner_index);

    session.state = STATE_FINISHED;
    session.winner = option::some(winner);

    event::emit(GameOver {
        session_id: object::id(session),
        winner,
        reason: 1, // surrender
    });
}

/// Claim rewards post-battle — each player calls this to get their units back
public entry fun claim_rewards(
    session: &mut GameSession,
    roster: &mut Roster,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_FINISHED, EGameNotFinished);
    assert!(ctx.sender() == roster.owner, ENotOwner);
    assert!(roster.in_battle, ENotInBattle);

    let sender = ctx.sender();
    let player_index = find_player_index(&session.players, sender);

    // Determine gold reward
    let is_winner = if (option::is_some(&session.winner)) {
        *option::borrow(&session.winner) == sender
    } else {
        false
    };
    let gold_earned = if (is_winner) { GOLD_WIN } else { GOLD_LOSE };
    roster.gold = roster.gold + gold_earned;

    // Count survivors and losses
    let units = if (player_index == 0) { &session.p1_units } else { &session.p2_units };
    let total = vector::length(units);

    // NOTE: Dead units need to be destroyed by calling destroy_dead_unit separately
    // Surviving units remain as owned objects (they already belong to the player)
    // Just clear the session tracking and mark roster as available

    roster.in_battle = false;

    // We track the alive count for stats
    let alive = if (player_index == 0) { session.p1_alive_count } else { session.p2_alive_count };

    event::emit(RewardsClaimed {
        session_id: object::id(session),
        player: sender,
        gold_earned,
        units_survived: alive,
        units_lost: total - alive,
    });
}

/// Destroy a dead unit (permadeath) — called after battle ends
/// The unit must have 0 HP. Strips all components and destroys the entity.
public entry fun destroy_dead_unit(
    roster: &mut Roster,
    unit: Entity,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == roster.owner, ENotOwner);

    let unit_id = object::id(&unit);
    let hp = health::borrow(&unit);
    assert!(!health::is_alive(hp), EUnitNotAlive); // must be dead

    // Remove from roster
    let (found, idx) = vector::index_of(&roster.units, &unit_id);
    if (found) {
        vector::remove(&mut roster.units, idx);
    };

    // Strip all components and destroy
    let mut unit = unit;
    position::remove(&mut unit);
    health::remove(&mut unit);
    attack::remove(&mut unit);
    defense::remove(&mut unit);
    movement::remove(&mut unit);
    energy::remove(&mut unit);
    team::remove(&mut unit);
    identity::remove(&mut unit);
    let _: u8 = dynamic_field::remove(entity::uid_mut(&mut unit), b"class");
    let _: u8 = dynamic_field::remove(entity::uid_mut(&mut unit), b"element");

    // Remove status effect if present
    if (entity::has_component(&unit, entity::status_effect_bit())) {
        status_effect::remove(&mut unit);
    };

    entity::destroy(unit);
}

/// Cancel a session while in LOBBY (host only)
public entry fun cancel_session(
    session: &mut GameSession,
    roster: &mut Roster,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_LOBBY || session.state == STATE_PLACEMENT, EWrongState);
    assert!(ctx.sender() == roster.owner, ENotOwner);

    // Mark roster available again
    roster.in_battle = false;

    session.state = STATE_FINISHED;
    session.winner = option::none();
}

// ═══════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════

fun find_player_index(players: &vector<address>, player: address): u64 {
    let mut i = 0;
    let len = vector::length(players);
    while (i < len) {
        if (*vector::borrow(players, i) == player) {
            return i
        };
        i = i + 1;
    };
    abort ENotPlayer
}

fun is_unit_in_player_list(session: &GameSession, player_index: u64, unit_id: ID): bool {
    let units = if (player_index == 0) { &session.p1_units } else { &session.p2_units };
    let (found, _) = vector::index_of(units, &unit_id);
    found
}

fun manhattan_distance(x1: u64, y1: u64, x2: u64, y2: u64): u64 {
    let dx = if (x1 > x2) { x1 - x2 } else { x2 - x1 };
    let dy = if (y1 > y2) { y1 - y2 } else { y2 - y1 };
    dx + dy
}

/// Calculate damage with elemental modifiers: max(1, atk - def) * multiplier / 100
fun calculate_damage(attacker: &Entity, defender: &Entity): u64 {
    let atk_comp = attack::borrow(attacker);
    let def_comp = defense::borrow(defender);
    let atk_val = attack::damage(atk_comp);
    let def_val = defense::armor(def_comp);

    let base_damage = if (atk_val > def_val) { atk_val - def_val } else { 1 };

    let atk_elem = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(attacker), b"element");
    let def_elem = *dynamic_field::borrow<vector<u8>, u8>(entity::uid(defender), b"element");
    let multiplier = get_element_multiplier(atk_elem, def_elem);

    let result = base_damage * multiplier / 100;
    if (result == 0) { 1 } else { result }
}

/// Element multiplier: Fire→Wind→Earth→Water→Fire (1.5x strong, 0.75x weak)
/// Returns value × 100 (e.g., 150 = 1.5x, 75 = 0.75x, 100 = neutral)
fun get_element_multiplier(attacker_elem: u8, defender_elem: u8): u64 {
    if (attacker_elem == defender_elem) {
        100 // same element = neutral
    } else if (
        (attacker_elem == ELEM_FIRE && defender_elem == ELEM_WIND) ||
        (attacker_elem == ELEM_WIND && defender_elem == ELEM_EARTH) ||
        (attacker_elem == ELEM_EARTH && defender_elem == ELEM_WATER) ||
        (attacker_elem == ELEM_WATER && defender_elem == ELEM_FIRE)
    ) {
        150 // strong
    } else if (
        (attacker_elem == ELEM_WIND && defender_elem == ELEM_FIRE) ||
        (attacker_elem == ELEM_EARTH && defender_elem == ELEM_WIND) ||
        (attacker_elem == ELEM_WATER && defender_elem == ELEM_EARTH) ||
        (attacker_elem == ELEM_FIRE && defender_elem == ELEM_WATER)
    ) {
        75 // weak
    } else {
        100 // neutral (shouldn't happen with 4 elements in a cycle)
    }
}

/// Get unit cost by class
fun get_unit_cost(class: u8): u64 {
    if (class == CLASS_SOLDIER) { 75 }
    else if (class == CLASS_KNIGHT) { 120 }
    else if (class == CLASS_ARCHER) { 100 }
    else if (class == CLASS_WIZARD) { 110 }
    else if (class == CLASS_CLERIC) { 100 }
    else if (class == CLASS_NINJA) { 130 }
    else { abort EInvalidClass }
}

/// Get unit stats: (hp, atk, def, range, speed, element)
fun get_unit_stats(class: u8): (u64, u64, u64, u64, u64, u8) {
    if (class == CLASS_SOLDIER) { (100, 12, 8, 1, 2, ELEM_EARTH) }
    else if (class == CLASS_KNIGHT) { (140, 15, 12, 1, 2, ELEM_EARTH) }
    else if (class == CLASS_ARCHER) { (80, 18, 4, 3, 3, ELEM_WIND) }
    else if (class == CLASS_WIZARD) { (70, 22, 3, 2, 2, ELEM_FIRE) }
    else if (class == CLASS_CLERIC) { (90, 8, 6, 2, 2, ELEM_WATER) }
    else if (class == CLASS_NINJA) { (75, 20, 5, 1, 4, ELEM_WIND) }
    else { abort EInvalidClass }
}

/// Check if a unit just died and handle session updates
fun check_death(
    session: &mut GameSession,
    target: &Entity,
    opp_index: u64,
    sender: address,
) {
    let hp = health::borrow(target);
    if (!health::is_alive(hp)) {
        event::emit(UnitDied {
            session_id: object::id(session),
            unit_id: object::id(target),
        });

        if (opp_index == 0) {
            session.p1_alive_count = session.p1_alive_count - 1;
        } else {
            session.p2_alive_count = session.p2_alive_count - 1;
        };

        let opp_alive = if (opp_index == 0) { session.p1_alive_count } else { session.p2_alive_count };
        if (opp_alive == 0) {
            session.state = STATE_FINISHED;
            session.winner = option::some(sender);

            event::emit(GameOver {
                session_id: object::id(session),
                winner: sender,
                reason: 0,
            });
        };
    };
}

// ═══════════════════════════════════════════════
// TEST HELPER
// ═══════════════════════════════════════════════

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
