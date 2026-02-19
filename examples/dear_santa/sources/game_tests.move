#[test_only]
module dear_santa::game_tests;

use std::ascii;
use std::vector;
use sui::test_scenario::{Self as ts, Scenario};
use sui::clock::{Self, Clock};
use dear_santa::game::{Self, SantaMailbox, AdminCap};

const ADMIN: address = @0xAD;
const PLAYER1: address = @0xB1;
const PLAYER2: address = @0xB2;
const PLAYER3: address = @0xB3;

#[test]
fun test_send_letter() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Player 1 sends a letter
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"I wish for world peace",
            &c,
            ts::ctx(&mut scenario),
        );

        // Verify letter count
        assert!(game::get_letter_count(&mailbox) == 1, 0);

        // Verify letter content
        let letter = game::get_letter(&mailbox, 1);
        assert!(game::letter_sender(letter) == PLAYER1, 1);
        assert!(game::letter_message(letter) == ascii::string(b"I wish for world peace"), 2);
        assert!(game::letter_number(letter) == 1, 3);

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
fun test_multiple_letters() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Player 1 sends a letter
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"I want a puppy",
            &c,
            ts::ctx(&mut scenario),
        );

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    // Player 2 sends a letter
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"I want mass adoption of web3",
            &c,
            ts::ctx(&mut scenario),
        );

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    // Player 3 sends a letter
    ts::next_tx(&mut scenario, PLAYER3);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"I want a blockchain Christmas tree",
            &c,
            ts::ctx(&mut scenario),
        );

        // Verify total count
        assert!(game::get_letter_count(&mailbox) == 3, 0);

        // Verify each letter
        let letter1 = game::get_letter(&mailbox, 1);
        assert!(game::letter_sender(letter1) == PLAYER1, 1);

        let letter2 = game::get_letter(&mailbox, 2);
        assert!(game::letter_sender(letter2) == PLAYER2, 2);

        let letter3 = game::get_letter(&mailbox, 3);
        assert!(game::letter_sender(letter3) == PLAYER3, 3);

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
fun test_get_recent_letters() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Send 3 letters
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(&mut mailbox, b"Letter one", &c, ts::ctx(&mut scenario));
        game::send_letter(&mut mailbox, b"Letter two", &c, ts::ctx(&mut scenario));
        game::send_letter(&mut mailbox, b"Letter three", &c, ts::ctx(&mut scenario));

        // Get recent 2
        let recent = game::get_recent_letters(&mailbox, 2);
        assert!(vector::length(&recent) == 2, 0);

        // Should be letters 2 and 3 (most recent)
        let r1 = vector::borrow(&recent, 0);
        assert!(game::letter_number(r1) == 2, 1);

        let r2 = vector::borrow(&recent, 1);
        assert!(game::letter_number(r2) == 3, 2);

        // Get recent 10 (more than exist) — should return all 3
        let all = game::get_recent_letters(&mailbox, 10);
        assert!(vector::length(&all) == 3, 3);

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
fun test_same_player_multiple_letters() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Player 1 sends multiple letters (unlimited)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(&mut mailbox, b"First wish", &c, ts::ctx(&mut scenario));
        game::send_letter(&mut mailbox, b"Second wish", &c, ts::ctx(&mut scenario));
        game::send_letter(&mut mailbox, b"Third wish", &c, ts::ctx(&mut scenario));

        assert!(game::get_letter_count(&mailbox) == 3, 0);

        // All from same sender
        let l1 = game::get_letter(&mailbox, 1);
        let l2 = game::get_letter(&mailbox, 2);
        let l3 = game::get_letter(&mailbox, 3);
        assert!(game::letter_sender(l1) == PLAYER1, 1);
        assert!(game::letter_sender(l2) == PLAYER1, 2);
        assert!(game::letter_sender(l3) == PLAYER1, 3);

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
fun test_close_and_reopen_mailbox() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Admin closes mailbox
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);

        game::close_mailbox(&admin_cap, &mut mailbox);
        assert!(!game::is_mailbox_open(&mailbox), 0);

        ts::return_shared(mailbox);
        ts::return_to_sender(&scenario, admin_cap);
    };

    // Admin reopens mailbox
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);

        game::open_mailbox(&admin_cap, &mut mailbox);
        assert!(game::is_mailbox_open(&mailbox), 1);

        ts::return_shared(mailbox);
        ts::return_to_sender(&scenario, admin_cap);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = game::EMailboxClosed)]
fun test_cannot_send_when_closed() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    // Admin closes mailbox
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);

        game::close_mailbox(&admin_cap, &mut mailbox);

        ts::return_shared(mailbox);
        ts::return_to_sender(&scenario, admin_cap);
    };

    // Player tries to send — should fail
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"This should fail",
            &c,
            ts::ctx(&mut scenario),
        );

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = game::EMessageEmpty)]
fun test_cannot_send_empty_message() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);
        let c = clock::create_for_testing(ts::ctx(&mut scenario));

        game::send_letter(
            &mut mailbox,
            b"",
            &c,
            ts::ctx(&mut scenario),
        );

        ts::return_shared(mailbox);
        clock::destroy_for_testing(c);
    };

    ts::end(scenario);
}

#[test]
fun test_set_season() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut mailbox = ts::take_shared<SantaMailbox>(&scenario);

        game::set_season(&admin_cap, &mut mailbox, b"Christmas 2026");
        assert!(game::get_season(&mailbox) == ascii::string(b"Christmas 2026"), 0);

        ts::return_shared(mailbox);
        ts::return_to_sender(&scenario, admin_cap);
    };

    ts::end(scenario);
}

#[test]
fun test_mailbox_starts_open() {
    let mut scenario = ts::begin(ADMIN);
    {
        game::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mailbox = ts::take_shared<SantaMailbox>(&scenario);
        assert!(game::is_mailbox_open(&mailbox), 0);
        assert!(game::get_season(&mailbox) == ascii::string(b"Christmas 2025"), 1);
        assert!(game::get_letter_count(&mailbox) == 0, 2);
        ts::return_shared(mailbox);
    };

    ts::end(scenario);
}
