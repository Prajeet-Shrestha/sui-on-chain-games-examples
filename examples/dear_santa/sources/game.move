module dear_santa::game;

use std::ascii::{Self, String};
use std::vector;
use sui::object::{Self, UID, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::event;
use sui::clock::Clock;
use sui::dynamic_field;
use world::world::{Self, World};
use entity::entity::{Self, Entity};

// === Error Constants ===
const EMailboxClosed: u64 = 100;
const EMessageTooLong: u64 = 101;
const EMessageEmpty: u64 = 102;
const ENotAdmin: u64 = 103;
const ELetterNotFound: u64 = 104;
const EInvalidLimit: u64 = 105;

// === Constants ===
const MAX_MESSAGE_LENGTH: u64 = 280;

// === Structs ===

/// Admin capability — given to deployer
public struct AdminCap has key, store {
    id: UID,
}

/// A single letter stored in the mailbox
public struct Letter has store, copy, drop {
    sender: address,
    message: String,
    letter_number: u64,
    sent_at: u64,
}

/// Santa's Mailbox — the shared object that collects all letters
public struct SantaMailbox has key {
    id: UID,
    season: String,
    is_open: bool,
    letter_count: u64,
    letters: vector<Letter>,
}

// === Events ===

public struct LetterDelivered has copy, drop {
    sender: address,
    letter_number: u64,
    message: String,
    sent_at: u64,
}

public struct MailboxOpened has copy, drop {
    mailbox_id: ID,
    season: String,
}

public struct MailboxClosed has copy, drop {
    mailbox_id: ID,
    total_letters: u64,
}

// === Init ===

/// Called once on publish. Creates the World, AdminCap, and SantaMailbox.
fun init(ctx: &mut TxContext) {
    // Create and share the World
    let world = world::create_world(
        ascii::string(b"DearSanta"),
        10000, // max_entities — generous limit for letters
        ctx,
    );
    world::share(world);

    // Create and transfer AdminCap to deployer
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, tx_context::sender(ctx));

    // Create and share the SantaMailbox
    let mailbox = SantaMailbox {
        id: object::new(ctx),
        season: ascii::string(b"Christmas 2025"),
        is_open: true,
        letter_count: 0,
        letters: vector::empty<Letter>(),
    };

    event::emit(MailboxOpened {
        mailbox_id: object::id(&mailbox),
        season: ascii::string(b"Christmas 2025"),
    });

    transfer::share_object(mailbox);
}

// === Core Entry Functions ===

/// Send a letter to Santa in a single transaction.
/// Creates the letter, writes the message, and deposits it into the mailbox.
/// Designed to be called as a single PTB or entry call.
public entry fun send_letter(
    mailbox: &mut SantaMailbox,
    message_bytes: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // 1. Validate mailbox is open
    assert!(mailbox.is_open, EMailboxClosed);

    // 2. Validate message
    let msg_len = vector::length(&message_bytes);
    assert!(msg_len > 0, EMessageEmpty);
    assert!(msg_len <= MAX_MESSAGE_LENGTH, EMessageTooLong);

    // 3. Create the message string
    let message = ascii::string(message_bytes);

    // 4. Increment letter count and assign number
    mailbox.letter_count = mailbox.letter_count + 1;
    let letter_number = mailbox.letter_count;

    // 5. Get timestamp
    let sent_at = clock.timestamp_ms();

    // 6. Get sender
    let sender = tx_context::sender(ctx);

    // 7. Create the letter
    let letter = Letter {
        sender,
        message,
        letter_number,
        sent_at,
    };

    // 8. Deposit into mailbox
    vector::push_back(&mut mailbox.letters, letter);

    // 9. Emit event
    event::emit(LetterDelivered {
        sender,
        letter_number,
        message,
        sent_at,
    });
}

// === Read Functions ===

/// Get the total number of letters in the mailbox
public fun get_letter_count(mailbox: &SantaMailbox): u64 {
    mailbox.letter_count
}

/// Get a specific letter by its number (1-indexed)
public fun get_letter(mailbox: &SantaMailbox, letter_number: u64): &Letter {
    assert!(letter_number > 0 && letter_number <= mailbox.letter_count, ELetterNotFound);
    let index = letter_number - 1;
    vector::borrow(&mailbox.letters, index)
}

/// Get the most recent N letters. Returns fewer if mailbox has less than N.
public fun get_recent_letters(mailbox: &SantaMailbox, limit: u64): vector<Letter> {
    assert!(limit > 0, EInvalidLimit);

    let total = vector::length(&mailbox.letters);
    let actual_limit = if (limit > total) { total } else { limit };

    let mut result = vector::empty<Letter>();
    let start = total - actual_limit;
    let mut i = start;
    while (i < total) {
        vector::push_back(&mut result, *vector::borrow(&mailbox.letters, i));
        i = i + 1;
    };

    result
}

/// Check if the mailbox is currently accepting letters
public fun is_mailbox_open(mailbox: &SantaMailbox): bool {
    mailbox.is_open
}

/// Get the season name
public fun get_season(mailbox: &SantaMailbox): String {
    mailbox.season
}

// === Letter Getters ===

public fun letter_sender(letter: &Letter): address {
    letter.sender
}

public fun letter_message(letter: &Letter): String {
    letter.message
}

public fun letter_number(letter: &Letter): u64 {
    letter.letter_number
}

public fun letter_sent_at(letter: &Letter): u64 {
    letter.sent_at
}

// === Admin Functions ===

/// Close the mailbox — no more letters accepted
public entry fun close_mailbox(
    _admin: &AdminCap,
    mailbox: &mut SantaMailbox,
) {
    mailbox.is_open = false;

    event::emit(MailboxClosed {
        mailbox_id: object::id(mailbox),
        total_letters: mailbox.letter_count,
    });
}

/// Reopen the mailbox
public entry fun open_mailbox(
    _admin: &AdminCap,
    mailbox: &mut SantaMailbox,
) {
    mailbox.is_open = true;

    event::emit(MailboxOpened {
        mailbox_id: object::id(mailbox),
        season: mailbox.season,
    });
}

/// Update the season name (e.g., for a new year)
public entry fun set_season(
    _admin: &AdminCap,
    mailbox: &mut SantaMailbox,
    new_season: vector<u8>,
) {
    mailbox.season = ascii::string(new_season);
}

// === Test Helpers ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
