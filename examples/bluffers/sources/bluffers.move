/// Bluffers — Fully on-chain multiplayer bluffing card game.
///
/// Rules:
/// - 20-card deck: 6 Kings (0), 6 Queens (1), 6 Jacks (2), 2 Jokers (3)
/// - Table Card revealed at start (King/Queen/Jack only)
/// - Current player plays 1-3 cards face down, ALWAYS claiming they are the Table Card
/// - Next player may Pass (accept) or Call Liar
///   - Pass: cards are revealed, confirmed to go to discard, turn advances
///   - Call Liar: cards revealed; if any non-Joker ≠ table card → accused pulls trigger
///               if all cards match or are Jokers → challenger pulls trigger
/// - Roulette: trigger position increases every pull (1/6, 2/6, 3/6 ... across whole game)
/// - Last alive wins
///
/// PTB Design:
/// - create_lobby  → creates BlufferGame shared object (ID = lobby code)
/// - join_lobby    → registers caller as player
/// - start_game    → deals hands, sets table card, emits HandDealt events, state = ACTIVE
/// - play_cards    → current player plays face-down (claim = table card automatically)
/// - pass          → next player accepts, reveals cards, turn advances
/// - call_liar     → next player challenges, reveals cards, resolves roulette
#[allow(lint(public_entry), lint(public_random), unused_use, duplicate_alias)]
module bluffers::bluffers;

use sui::event;
use sui::random::{Self, Random};

// ============================================================
// Card constants
// ============================================================
const CARD_KING: u8   = 0;
const CARD_QUEEN: u8  = 1;
const CARD_JACK: u8   = 2;
const CARD_JOKER: u8  = 3;

// ============================================================
// State constants
// ============================================================
const STATE_LOBBY: u8    = 0;
const STATE_ACTIVE: u8   = 1;
const STATE_FINISHED: u8 = 2;

// Pending-play sub-state
const PENDING_NONE: u8   = 0; // no cards played yet this turn
const PENDING_PLAYED: u8 = 1; // cards played, waiting for challenge/pass
const PENDING_ROULETTE: u8 = 2; // empty-hand roulette — acceptor must call trigger_pull

const MAX_PLAYERS: u64 = 6;
const MIN_PLAYERS: u64 = 2;
const CHAMBER_SIZE: u8 = 6;
const CARDS_PER_SUIT: u64 = 6;
const JOKER_COUNT: u64 = 2;
const INITIAL_HAND_SIZE: u64 = 6;

// ============================================================
// Errors
// ============================================================
const ENotLobby: u64        = 100;
const ENotActive: u64       = 101;
const EGameFull: u64        = 102;
const EAlreadyJoined: u64   = 103;
const ENotCreator: u64      = 104;
const ENotEnoughPlayers: u64 = 105;
const ENotYourTurn: u64     = 106;
const ENoPendingPlay: u64   = 107;
const EPendingPlay: u64     = 108; // must resolve pending before acting
const EInvalidCards: u64    = 109; // invalid card indices
const EInvalidCardCount: u64 = 111;
const ENotNextPlayer: u64   = 112;
const EAliveOnly: u64       = 114;

// ============================================================
// Structs
// ============================================================

/// Shared registry — one per deployment, tracks total games (informational).
public struct GameRegistry has key {
    id: UID,
    total_games: u64,
}

/// One BlufferGame per lobby. Its object ID is the lobby code.
public struct BlufferGame has key {
    id: UID,
    state: u8,
    creator: address,

    // Players
    players: vector<address>,   // registered (index = player_index)
    alive: vector<bool>,        // parallel: whether player is still in

    max_players: u64,           // 2..6

    // Deck & hands — stored in plain struct fields (visible on-chain)
    deck: vector<u8>,                   // draw pile (face values)
    discard: vector<u8>,                // discard pile
    hands: vector<vector<u8>>,          // hands[player_index] = their cards

    // Round state
    table_card: u8,             // current round's required card type
    round: u64,

    // Pending play
    pending_state: u8,          // PENDING_NONE | PENDING_PLAYED
    pending_player_idx: u64,    // who played
    pending_cards: vector<u8>,  // actual cards played (revealed when resolved)
    pending_count: u64,         // how many played (public info)

    // Turn
    current_player_idx: u64,    // index into players[] (alive players only rotate)

    // Russian Roulette — trigger accumulates PER PLAYER across the whole game
    bullet_chamber: u8,         // most recent chamber drawn (0..5)
    roulette_triggers: vector<u8>, // per-player pull position (starts at 0, wraps at 6)

    // Winner
    winner: Option<address>,
}

// ============================================================
// Events
// ============================================================
public struct GameCreated has copy, drop {
    game_id: ID,
    creator: address,
    max_players: u64,
}

public struct PlayerJoined has copy, drop {
    game_id: ID,
    player: address,
    player_index: u64,
}

public struct GameStarted has copy, drop {
    game_id: ID,
    player_count: u64,
    table_card: u8,
}

/// Emitted once per player at game start so frontend can see each player's hand
public struct HandDealt has copy, drop {
    game_id: ID,
    player: address,
    player_index: u64,
    hand: vector<u8>,
}

public struct CardsPlayed has copy, drop {
    game_id: ID,
    player: address,
    count: u64,
    // claim is always the table card — no separate field needed
}

/// Emitted on Pass: reveals what the cards actually were
public struct PlayAccepted has copy, drop {
    game_id: ID,
    passer: address,
    accused: address,
    revealed_cards: vector<u8>,
    next_player: address,
}

public struct LiarCalled has copy, drop {
    game_id: ID,
    challenger: address,
    accused: address,
    actual_cards: vector<u8>,
    was_lying: bool,
}

public struct RouletteResult has copy, drop {
    game_id: ID,
    player: address,
    bullet_chamber: u8,
    trigger_position: u8,  // which pull this was (0=1st, 1=2nd, etc.)
    eliminated: bool,
}

public struct PlayerEliminated has copy, drop {
    game_id: ID,
    player: address,
    players_remaining: u64,
}

public struct NewRound has copy, drop {
    game_id: ID,
    round: u64,
    table_card: u8,
}

public struct HandEmptied has copy, drop {
    game_id: ID,
    player: address,          // player who emptied their hand
    accepter: address,        // player who must now pull the trigger
}

public struct GameOver has copy, drop {
    game_id: ID,
    winner: address,
}

// ============================================================
// Init — creates GameRegistry once on publish
// ============================================================
fun init(ctx: &mut TxContext) {
    let registry = GameRegistry {
        id: object::new(ctx),
        total_games: 0,
    };
    transfer::share_object(registry);
}

// ============================================================
// create_lobby — any player can create a new game lobby
// ============================================================
public entry fun create_lobby(
    registry: &mut GameRegistry,
    max_players: u64,
    ctx: &mut TxContext,
) {
    assert!(max_players >= MIN_PLAYERS && max_players <= MAX_PLAYERS, EGameFull);

    let creator = tx_context::sender(ctx);

    let mut game = BlufferGame {
        id: object::new(ctx),
        state: STATE_LOBBY,
        creator,
        players: vector::empty(),
        alive: vector::empty(),
        max_players,
        deck: vector::empty(),
        discard: vector::empty(),
        hands: vector::empty(),
        table_card: CARD_KING,
        round: 0,
        pending_state: PENDING_NONE,
        pending_player_idx: 0,
        pending_cards: vector::empty(),
        pending_count: 0,
        current_player_idx: 0,
        bullet_chamber: 0,
        roulette_triggers: vector::empty(),
        winner: option::none(),
    };

    // Creator auto-joins
    let idx = vector::length(&game.players);
    vector::push_back(&mut game.players, creator);
    vector::push_back(&mut game.alive, true);
    vector::push_back(&mut game.hands, vector::empty());
    vector::push_back(&mut game.roulette_triggers, 0);

    registry.total_games = registry.total_games + 1;

    event::emit(GameCreated {
        game_id: object::id(&game),
        creator,
        max_players,
    });
    event::emit(PlayerJoined {
        game_id: object::id(&game),
        player: creator,
        player_index: idx,
    });

    transfer::share_object(game);
}

// ============================================================
// join_lobby — other players join before game starts
// ============================================================
public entry fun join_lobby(
    game: &mut BlufferGame,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_LOBBY, ENotLobby);
    assert!(vector::length(&game.players) < game.max_players, EGameFull);

    let player = tx_context::sender(ctx);

    // Prevent duplicate join
    let n = vector::length(&game.players);
    let mut i = 0;
    while (i < n) {
        assert!(*vector::borrow(&game.players, i) != player, EAlreadyJoined);
        i = i + 1;
    };

    let idx = vector::length(&game.players);
    vector::push_back(&mut game.players, player);
    vector::push_back(&mut game.alive, true);
    vector::push_back(&mut game.hands, vector::empty());
    vector::push_back(&mut game.roulette_triggers, 0);

    event::emit(PlayerJoined {
        game_id: object::id(game),
        player,
        player_index: idx,
    });
}

// ============================================================
// start_game — creator starts when ready (min 2 players)
// ============================================================
public entry fun start_game(
    game: &mut BlufferGame,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_LOBBY, ENotLobby);
    assert!(tx_context::sender(ctx) == game.creator, ENotCreator);
    let n = vector::length(&game.players);
    assert!(n >= MIN_PLAYERS, ENotEnoughPlayers);

    // Build 20-card deck
    let mut deck = build_deck();

    // Shuffle deck
    let mut rng = random::new_generator(r, ctx);
    shuffle_deck(&mut deck, &mut rng);

    // Deal INITIAL_HAND_SIZE cards to each player
    let player_count = vector::length(&game.players);
    let mut p = 0;
    while (p < player_count) {
        let mut hand: vector<u8> = vector::empty();
        let mut c = 0;
        while (c < INITIAL_HAND_SIZE) {
            if (vector::length(&deck) == 0) break;
            let card = vector::pop_back(&mut deck);
            vector::push_back(&mut hand, card);
            c = c + 1;
        };
        // Replace empty hand placeholder
        let existing = vector::borrow_mut(&mut game.hands, p);
        *existing = hand;
        p = p + 1;
    };

    game.deck = deck;
    game.round = 1;
    game.state = STATE_ACTIVE;
    game.current_player_idx = 0;
    // Reset all per-player roulette triggers to 0
    let n = vector::length(&game.roulette_triggers);
    let mut i = 0;
    while (i < n) {
        let t = vector::borrow_mut(&mut game.roulette_triggers, i);
        *t = 0;
        i = i + 1;
    };

    // Draw table card (must be non-Joker)
    let table = draw_table_card(&mut game.deck);
    game.table_card = table;
    let game_id = object::id(game);

    event::emit(GameStarted {
        game_id,
        player_count,
        table_card: table,
    });

    // Emit each player's hand so the frontend can display cards
    let mut pi = 0;
    while (pi < player_count) {
        let hand = *vector::borrow(&game.hands, pi);
        let player = *vector::borrow(&game.players, pi);
        event::emit(HandDealt {
            game_id,
            player,
            player_index: pi,
            hand,
        });
        pi = pi + 1;
    };
}

// ============================================================
// play_cards — current player plays 1-3 cards face-down
// The claim is ALWAYS the current table card — no choice needed
// card_indices: indices into the player's own hand (0-based)
// ============================================================
public entry fun play_cards(
    game: &mut BlufferGame,
    card_indices: vector<u64>,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_ACTIVE, ENotActive);
    assert!(game.pending_state == PENDING_NONE, EPendingPlay);

    let sender = tx_context::sender(ctx);
    let player_idx = game.current_player_idx;
    assert!(*vector::borrow(&game.players, player_idx) == sender, ENotYourTurn);
    assert!(*vector::borrow(&game.alive, player_idx), EAliveOnly);

    let count = vector::length(&card_indices);
    assert!(count >= 1 && count <= 3, EInvalidCardCount);

    // Validate all indices are in range (and not duplicate)
    let hand = vector::borrow(&game.hands, player_idx);
    let hand_len = vector::length(hand);

    let mut j = 0;
    while (j < count) {
        let idx = *vector::borrow(&card_indices, j);
        assert!(idx < hand_len, EInvalidCards);
        // Check for duplicates
        let mut k = j + 1;
        while (k < count) {
            assert!(*vector::borrow(&card_indices, k) != idx, EInvalidCards);
            k = k + 1;
        };
        j = j + 1;
    };

    // Extract the actual cards (remove from hand, store in pending)
    // We remove from highest index first to keep indices stable
    let mut sorted_indices = card_indices;
    sort_desc(&mut sorted_indices);

    let hand_mut = vector::borrow_mut(&mut game.hands, player_idx);
    let mut played: vector<u8> = vector::empty();
    let mut m = 0;
    while (m < count) {
        let idx = *vector::borrow(&sorted_indices, m);
        let card = vector::remove(hand_mut, idx);
        vector::push_back(&mut played, card);
        m = m + 1;
    };

    game.pending_state = PENDING_PLAYED;
    game.pending_player_idx = player_idx;
    game.pending_cards = played;
    // Claim is always the table card — no choice
    game.pending_count = count;

    event::emit(CardsPlayed {
        game_id: object::id(game),
        player: sender,
        count,
    });
}

// ============================================================
// pass — next player accepts the play
// Reveals the actual cards, moves to discard, advances turn
// ============================================================
public entry fun pass(
    game: &mut BlufferGame,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_ACTIVE, ENotActive);
    assert!(game.pending_state == PENDING_PLAYED, ENoPendingPlay);

    let sender = tx_context::sender(ctx);
    // The next player (after pending_player_idx) must call pass
    let next_idx = next_alive_player(game, game.pending_player_idx);
    assert!(*vector::borrow(&game.players, next_idx) == sender, ENotNextPlayer);

    let next_player_addr = *vector::borrow(&game.players, next_idx);
    let accused_addr = *vector::borrow(&game.players, game.pending_player_idx);

    // Reveal the actual cards
    let revealed = game.pending_cards;
    game.pending_cards = vector::empty();

    // Move played cards to discard
    let mut cards = revealed;
    let revealed_copy = cards;
    while (!vector::is_empty(&cards)) {
        let c = vector::pop_back(&mut cards);
        vector::push_back(&mut game.discard, c);
    };
    vector::destroy_empty(cards);

    game.pending_state = PENDING_NONE;
    game.pending_count = 0;

    event::emit(PlayAccepted {
        game_id: object::id(game),
        passer: sender,
        accused: accused_addr,
        revealed_cards: revealed_copy,
        next_player: next_player_addr,
    });

    // ── Empty-hand check ──────────────────────────────────────────
    // If the player who just played has emptied their hand,
    // the accepter (sender) must face the roulette trigger.
    let placer_hand_empty = vector::is_empty(vector::borrow(&game.hands, game.pending_player_idx));
    if (placer_hand_empty) {
        // Accepter faces roulette — store who is pending and set special state
        game.pending_player_idx = next_idx;
        game.pending_state = PENDING_ROULETTE;
        event::emit(HandEmptied {
            game_id: object::id(game),
            player: accused_addr,
            accepter: next_player_addr,
        });
        return
    };

    // Normal advance: turn goes to accepter
    game.current_player_idx = next_idx;

    // If deck is low, reshuffle discard into deck
    maybe_reshuffle(game);
}

// ============================================================
// trigger_pull — accepter faces roulette after emptying opponent's hand
// Called when pending_state == PENDING_ROULETTE
// ============================================================
public entry fun trigger_pull(
    game: &mut BlufferGame,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_ACTIVE, ENotActive);
    assert!(game.pending_state == PENDING_ROULETTE, ENoPendingPlay);

    let sender = tx_context::sender(ctx);
    let target_idx = game.pending_player_idx; // the accepter who must pull
    assert!(*vector::borrow(&game.players, target_idx) == sender, ENotNextPlayer);
    assert!(*vector::borrow(&game.alive, target_idx), EAliveOnly);

    let target_addr = *vector::borrow(&game.players, target_idx);

    game.pending_state = PENDING_NONE;
    game.pending_count = 0;

    // Resolve roulette for the accepter — per-player trigger
    let mut rng = random::new_generator(r, ctx);
    let bullet_chamber_val = random::generate_u8_in_range(&mut rng, 0, CHAMBER_SIZE - 1);
    let trigger_pos = *vector::borrow(&game.roulette_triggers, target_idx);
    // Cumulative probability: pull 1 = 1/6, pull 2 = 2/6, ... pull 6 = 6/6 (guaranteed)
    let eliminated = (bullet_chamber_val <= trigger_pos);

    event::emit(RouletteResult {
        game_id: object::id(game),
        player: target_addr,
        bullet_chamber: bullet_chamber_val,
        trigger_position: trigger_pos,
        eliminated,
    });

    // Advance this player's trigger (cap at CHAMBER_SIZE-1, death resets all)
    if (trigger_pos + 1 < CHAMBER_SIZE) {
        let tref = vector::borrow_mut(&mut game.roulette_triggers, target_idx);
        *tref = trigger_pos + 1;
    };
    game.bullet_chamber = bullet_chamber_val;

    if (eliminated) {
        let alive_ref = vector::borrow_mut(&mut game.alive, target_idx);
        *alive_ref = false;

        // Death resets ALL player triggers to 0
        reset_all_triggers(game);

        let remaining = count_alive(&game.alive);

        event::emit(PlayerEliminated {
            game_id: object::id(game),
            player: target_addr,
            players_remaining: remaining,
        });

        if (remaining == 1) {
            let winner_idx = find_first_alive(&game.alive);
            let winner_addr = *vector::borrow(&game.players, winner_idx);
            game.winner = option::some(winner_addr);
            game.state = STATE_FINISHED;
            event::emit(GameOver {
                game_id: object::id(game),
                winner: winner_addr,
            });
            return
        };

        // Eliminated player loses their hand
        let elim_hand = vector::borrow_mut(&mut game.hands, target_idx);
        let mut eh = *elim_hand;
        *elim_hand = vector::empty();
        while (!vector::is_empty(&eh)) {
            let c = vector::pop_back(&mut eh);
            vector::push_back(&mut game.discard, c);
        };
        vector::destroy_empty(eh);
    };

    // Always start new round after empty-hand trigger pull
    start_new_round(game, &mut rng);
}

// ============================================================
// call_liar — next player challenges the play
// Resolves the challenge and triggers Russian Roulette
// Trigger position accumulates until a death resets ALL triggers
// ============================================================
public entry fun call_liar(
    game: &mut BlufferGame,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(game.state == STATE_ACTIVE, ENotActive);
    assert!(game.pending_state == PENDING_PLAYED, ENoPendingPlay);

    let sender = tx_context::sender(ctx);
    let challenger_idx = next_alive_player(game, game.pending_player_idx);
    assert!(*vector::borrow(&game.players, challenger_idx) == sender, ENotNextPlayer);

    let accused_idx = game.pending_player_idx;
    let accused_addr = *vector::borrow(&game.players, accused_idx);
    let actual_cards = game.pending_cards;

    // Check if the accused was lying:
    // Lying = any played card is NOT the table card AND is NOT a Joker
    let table = game.table_card;
    let was_lying = check_lying(&actual_cards, table);

    event::emit(LiarCalled {
        game_id: object::id(game),
        challenger: sender,
        accused: accused_addr,
        actual_cards,
        was_lying,
    });

    // Move played cards to discard
    game.pending_cards = vector::empty();
    let mut discard_cards = actual_cards;
    while (!vector::is_empty(&discard_cards)) {
        let c = vector::pop_back(&mut discard_cards);
        vector::push_back(&mut game.discard, c);
    };
    vector::destroy_empty(discard_cards);
    game.pending_state = PENDING_NONE;
    game.pending_count = 0;

    // Determine who faces roulette
    let roulette_target_idx = if (was_lying) { accused_idx } else { challenger_idx };
    let roulette_target_addr = *vector::borrow(&game.players, roulette_target_idx);

    // Russian Roulette — per-player trigger accumulates independently
    let mut rng = random::new_generator(r, ctx);
    let bullet_chamber_val = random::generate_u8_in_range(&mut rng, 0, CHAMBER_SIZE - 1);
    let trigger_pos = *vector::borrow(&game.roulette_triggers, roulette_target_idx);
    // Cumulative probability: pull 1 = 1/6, pull 2 = 2/6, ... pull 6 = 6/6 (guaranteed)
    let eliminated = (bullet_chamber_val <= trigger_pos);

    event::emit(RouletteResult {
        game_id: object::id(game),
        player: roulette_target_addr,
        bullet_chamber: bullet_chamber_val,
        trigger_position: trigger_pos,
        eliminated,
    });

    // Advance this player's trigger (cap at CHAMBER_SIZE-1, death resets all)
    if (trigger_pos + 1 < CHAMBER_SIZE) {
        let tref = vector::borrow_mut(&mut game.roulette_triggers, roulette_target_idx);
        *tref = trigger_pos + 1;
    };
    game.bullet_chamber = bullet_chamber_val;

    if (eliminated) {
        // Mark player as eliminated
        let alive_ref = vector::borrow_mut(&mut game.alive, roulette_target_idx);
        *alive_ref = false;

        // Death resets ALL player triggers to 0
        reset_all_triggers(game);

        let remaining = count_alive(&game.alive);

        event::emit(PlayerEliminated {
            game_id: object::id(game),
            player: roulette_target_addr,
            players_remaining: remaining,
        });

        if (remaining == 1) {
            // Game over — find winner
            let winner_idx = find_first_alive(&game.alive);
            let winner_addr = *vector::borrow(&game.players, winner_idx);
            game.winner = option::some(winner_addr);
            game.state = STATE_FINISHED;

            event::emit(GameOver {
                game_id: object::id(game),
                winner: winner_addr,
            });
            return
        };

        // Eliminated player loses their hand (cards go to discard)
        let elim_hand = vector::borrow_mut(&mut game.hands, roulette_target_idx);
        let mut eh = *elim_hand;
        *elim_hand = vector::empty();
        while (!vector::is_empty(&eh)) {
            let c = vector::pop_back(&mut eh);
            vector::push_back(&mut game.discard, c);
        };
        vector::destroy_empty(eh);
    };

    // Start new round — pick next table card
    // Triggers accumulate until a death resets them all
    start_new_round(game, &mut rng);
}

// ============================================================
// Internal helpers
// ============================================================

/// Build the 20-card deck: 6 Kings, 6 Queens, 6 Jacks, 2 Jokers
fun build_deck(): vector<u8> {
    let mut deck: vector<u8> = vector::empty();
    let mut i = 0;
    while (i < CARDS_PER_SUIT) {
        vector::push_back(&mut deck, CARD_KING);
        i = i + 1;
    };
    i = 0;
    while (i < CARDS_PER_SUIT) {
        vector::push_back(&mut deck, CARD_QUEEN);
        i = i + 1;
    };
    i = 0;
    while (i < CARDS_PER_SUIT) {
        vector::push_back(&mut deck, CARD_JACK);
        i = i + 1;
    };
    i = 0;
    while (i < JOKER_COUNT) {
        vector::push_back(&mut deck, CARD_JOKER);
        i = i + 1;
    };
    deck
}

/// Fisher-Yates shuffle using Sui Random
fun shuffle_deck(deck: &mut vector<u8>, rng: &mut random::RandomGenerator) {
    let n = vector::length(deck);
    if (n <= 1) return;
    let mut i = n - 1;
    while (i > 0) {
        let j_idx = random::generate_u64_in_range(rng, 0, i);
        vector::swap(deck, i, j_idx);
        i = i - 1;
    };
}

/// Draw from deck; skip Jokers (table card must be King/Queen/Jack)
fun draw_table_card(deck: &mut vector<u8>): u8 {
    loop {
        if (vector::is_empty(deck)) {
            return CARD_KING
        };
        let card = vector::pop_back(deck);
        if (card != CARD_JOKER) {
            return card
        };
    }
}

/// Check if a play is lying: any card is not the table card AND not a Joker
fun check_lying(cards: &vector<u8>, table_card: u8): bool {
    let n = vector::length(cards);
    let mut i = 0;
    let mut lying = false;
    while (i < n) {
        let card = *vector::borrow(cards, i);
        if (card != table_card && card != CARD_JOKER) {
            lying = true;
            break
        };
        i = i + 1;
    };
    lying
}

/// Count how many players are still alive
fun count_alive(alive: &vector<bool>): u64 {
    let n = vector::length(alive);
    let mut count = 0u64;
    let mut i = 0;
    while (i < n) {
        if (*vector::borrow(alive, i)) {
            count = count + 1;
        };
        i = i + 1;
    };
    count
}

/// Find the index of the first alive player
fun find_first_alive(alive: &vector<bool>): u64 {
    let n = vector::length(alive);
    let mut i = 0;
    while (i < n) {
        if (*vector::borrow(alive, i)) return i;
        i = i + 1;
    };
    0
}

/// Find the next alive player after given index (wraps around)
fun next_alive_player(game: &BlufferGame, from_idx: u64): u64 {
    let n = vector::length(&game.players);
    let mut idx = (from_idx + 1) % n;
    let mut attempts = 0;
    while (attempts < n) {
        if (*vector::borrow(&game.alive, idx)) return idx;
        idx = (idx + 1) % n;
        attempts = attempts + 1;
    };
    from_idx // fallback (should not reach here if game is active)
}

/// Reshuffle discard into deck if deck is empty
fun maybe_reshuffle(game: &mut BlufferGame) {
    if (!vector::is_empty(&game.deck)) return;
    let d = game.discard;
    game.discard = vector::empty();
    game.deck = d;
}

/// Reset all player triggers to 0 (called when someone dies)
fun reset_all_triggers(game: &mut BlufferGame) {
    let n = vector::length(&game.roulette_triggers);
    let mut i = 0;
    while (i < n) {
        let t = vector::borrow_mut(&mut game.roulette_triggers, i);
        *t = 0;
        i = i + 1;
    };
}

/// Start a new round: new table card, advance to next alive player
fun start_new_round(game: &mut BlufferGame, rng: &mut random::RandomGenerator) {
    game.round = game.round + 1;

    // Collect all current hands back into the discard pile
    let n = vector::length(&game.players);
    let mut p = 0;
    while (p < n) {
        let hand = vector::borrow_mut(&mut game.hands, p);
        while (!vector::is_empty(hand)) {
            let c = vector::pop_back(hand);
            vector::push_back(&mut game.discard, c);
        };
        p = p + 1;
    };

    // Rebuild + reshuffle deck from discard if low
    let total_needed = n * INITIAL_HAND_SIZE + 1; // hands + table card
    let deck_size = vector::length(&game.deck);
    if (deck_size < total_needed) {
        let mut d = game.discard;
        game.discard = vector::empty();
        shuffle_deck(&mut d, rng);
        // Merge remaining deck into freshly shuffled discard
        while (!vector::is_empty(&game.deck)) {
            let c = vector::pop_back(&mut game.deck);
            vector::push_back(&mut d, c);
        };
        game.deck = d;
    };

    // If still not enough, build a completely fresh deck
    if (vector::length(&game.deck) < total_needed) {
        let mut fresh = build_deck();
        shuffle_deck(&mut fresh, rng);
        game.deck = fresh;
    };

    // Deal INITIAL_HAND_SIZE cards to each alive player
    let mut p2 = 0;
    while (p2 < n) {
        if (*vector::borrow(&game.alive, p2)) {
            let hand = vector::borrow_mut(&mut game.hands, p2);
            let mut c = 0;
            while (c < INITIAL_HAND_SIZE && !vector::is_empty(&game.deck)) {
                let card = vector::pop_back(&mut game.deck);
                vector::push_back(hand, card);
                c = c + 1;
            };
        };
        p2 = p2 + 1;
    };

    // New table card
    if (vector::is_empty(&game.deck)) {
        let mut fresh = build_deck();
        shuffle_deck(&mut fresh, rng);
        game.deck = fresh;
    };
    let table = draw_table_card(&mut game.deck);
    game.table_card = table;

    // Advance current player to next alive (from pending_player_idx)
    let next = next_alive_player(game, game.pending_player_idx);
    game.current_player_idx = next;

    event::emit(NewRound {
        game_id: object::id(game),
        round: game.round,
        table_card: table,
    });
}


/// Sort a vector in descending order (simple insertion sort for small N <= 3)
fun sort_desc(v: &mut vector<u64>) {
    let n = vector::length(v);
    if (n <= 1) return;
    let mut i = 1;
    while (i < n) {
        let mut j = i;
        while (j > 0) {
            let jv = *vector::borrow(v, j);
            let jprev = *vector::borrow(v, j - 1);
            if (jv > jprev) {
                vector::swap(v, j, j - 1);
                j = j - 1;
            } else {
                break
            };
        };
        i = i + 1;
    };
}

// ============================================================
// Read-only view helpers (for frontend & tests)
// ============================================================

public fun game_state(game: &BlufferGame): u8 { game.state }
public fun table_card(game: &BlufferGame): u8 { game.table_card }
public fun current_player_idx(game: &BlufferGame): u64 { game.current_player_idx }
public fun current_player_addr(game: &BlufferGame): address {
    *vector::borrow(&game.players, game.current_player_idx)
}
public fun round(game: &BlufferGame): u64 { game.round }
public fun players(game: &BlufferGame): &vector<address> { &game.players }
public fun alive(game: &BlufferGame): &vector<bool> { &game.alive }
public fun player_hand(game: &BlufferGame, idx: u64): &vector<u8> {
    vector::borrow(&game.hands, idx)
}
public fun pending_count(game: &BlufferGame): u64 { game.pending_count }
public fun pending_claim(game: &BlufferGame): u8 { game.table_card } // alias: claim = table card
public fun pending_state(game: &BlufferGame): u8 { game.pending_state }
public fun roulette_triggers(game: &BlufferGame): vector<u8> { game.roulette_triggers }
public fun winner(game: &BlufferGame): Option<address> { game.winner }
public fun creator(game: &BlufferGame): address { game.creator }
public fun max_players(game: &BlufferGame): u64 { game.max_players }
public fun player_count(game: &BlufferGame): u64 { vector::length(&game.players) }

// ============================================================
// Test-only init helper
// ============================================================
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
