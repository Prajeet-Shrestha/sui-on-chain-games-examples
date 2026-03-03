/// SuiDeliver — Fully on-chain Newspaper Delivery game.
/// Every delivery attempt is recorded on-chain via PTB-batched transactions.
/// Game replay can be reconstructed from DeliveryAttempted events.
module newspaper_delivery::game;

// === Imports ===
use std::ascii;
use sui::event;
use world::world::{Self, World};

// === Errors ===
const ENotPlayer: u64 = 100;
const EGameNotActive: u64 = 101;
const EGameAlreadyFinished: u64 = 102;
const EInvalidScoreTier: u64 = 103;

// Game states
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// Score tiers
const TIER_PERFECT: u64 = 0; // +100
const TIER_GOOD: u64 = 1;    // +50
const TIER_OK: u64 = 2;      // +10
const TIER_MISS: u64 = 3;    // +0

// === GameSession ===
public struct GameSession has key {
    id: UID,
    state: u8,
    player: address,
    score: u64,
    total_deliveries: u64,
    perfect_count: u64,
    good_count: u64,
    ok_count: u64,
    miss_count: u64,
    game_over: bool,
}

// === Events ===
public struct GameStarted has copy, drop {
    session_id: ID,
    player: address,
}

public struct DeliveryAttempted has copy, drop {
    session_id: ID,
    house_id: u64,
    score_tier: u64,
    points_earned: u64,
    cumulative_score: u64,
    delivery_number: u64,
}

public struct GameSaved has copy, drop {
    session_id: ID,
    player: address,
    final_score: u64,
    total_deliveries: u64,
    perfect_count: u64,
    good_count: u64,
    ok_count: u64,
    miss_count: u64,
}

// === Init ===
fun init(ctx: &mut TxContext) {
    let w = world::create_world(
        ascii::string(b"SuiDeliver"),
        100,
        ctx,
    );
    world::share(w);
}

// === Entry Functions ===

/// Start a new game. Creates a shared GameSession.
public entry fun start_game(
    _world: &World,
    ctx: &mut TxContext,
) {
    let session = GameSession {
        id: object::new(ctx),
        state: STATE_ACTIVE,
        player: ctx.sender(),
        score: 0,
        total_deliveries: 0,
        perfect_count: 0,
        good_count: 0,
        ok_count: 0,
        miss_count: 0,
        game_over: false,
    };

    event::emit(GameStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
    });

    transfer::share_object(session);
}

/// Record a single delivery attempt on-chain.
/// Called multiple times in a single PTB (batched).
/// score_tier: 0=Perfect, 1=Good, 2=OK, 3=Miss
public entry fun record_delivery(
    session: &mut GameSession,
    house_id: u64,
    score_tier: u64,
    cumulative_score: u64,
    deliveries_made: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(!session.game_over, EGameAlreadyFinished);
    assert!(score_tier <= 3, EInvalidScoreTier);

    let points = if (score_tier == TIER_PERFECT) {
        100
    } else if (score_tier == TIER_GOOD) {
        50
    } else if (score_tier == TIER_OK) {
        10
    } else {
        0
    };

    // Update counters
    session.total_deliveries = deliveries_made;
    session.score = cumulative_score;

    if (score_tier == TIER_PERFECT) {
        session.perfect_count = session.perfect_count + 1;
    } else if (score_tier == TIER_GOOD) {
        session.good_count = session.good_count + 1;
    } else if (score_tier == TIER_OK) {
        session.ok_count = session.ok_count + 1;
    } else {
        session.miss_count = session.miss_count + 1;
    };

    event::emit(DeliveryAttempted {
        session_id: object::id(session),
        house_id,
        score_tier,
        points_earned: points,
        cumulative_score,
        delivery_number: deliveries_made,
    });
}

/// Save the final game results to the blockchain.
/// Can be batched in the same PTB as remaining record_delivery calls.
public entry fun save_game(
    session: &mut GameSession,
    final_score: u64,
    total_deliveries: u64,
    perfect_count: u64,
    good_count: u64,
    ok_count: u64,
    miss_count: u64,
    ctx: &TxContext,
) {
    assert!(session.player == ctx.sender(), ENotPlayer);
    assert!(session.state == STATE_ACTIVE, EGameNotActive);
    assert!(!session.game_over, EGameAlreadyFinished);

    session.score = final_score;
    session.total_deliveries = total_deliveries;
    session.perfect_count = perfect_count;
    session.good_count = good_count;
    session.ok_count = ok_count;
    session.miss_count = miss_count;
    session.game_over = true;
    session.state = STATE_FINISHED;

    event::emit(GameSaved {
        session_id: object::id(session),
        player: ctx.sender(),
        final_score,
        total_deliveries,
        perfect_count,
        good_count,
        ok_count,
        miss_count,
    });
}

// === Test Helpers ===
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
