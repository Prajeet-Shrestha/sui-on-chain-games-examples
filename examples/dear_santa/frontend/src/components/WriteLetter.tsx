import { useState, useCallback } from 'react';
import { useGameActions } from '../hooks/useGameActions';
import { useUIStore } from '../stores/uiStore';
import { MAX_MESSAGE_LENGTH } from '../constants';
import type { SantaMailbox } from '../lib/types';

export function WriteLetter({ mailbox }: { mailbox: SantaMailbox }) {
    const [message, setMessage] = useState('');
    const { sendLetter } = useGameActions();
    const { isPending, error, setView, setLastSentLetterNumber } = useUIStore();
    const [isFolding, setIsFolding] = useState(false);

    const charCount = message.length;
    const isValid = charCount > 0 && charCount <= MAX_MESSAGE_LENGTH;
    const isAscii = /^[\x00-\x7F]*$/.test(message);

    const handleSend = useCallback(async () => {
        if (!isValid || !isAscii) return;
        try {
            setIsFolding(true);
            await sendLetter(message);
            setLastSentLetterNumber(mailbox.letterCount + 1);
            setMessage('');
            setTimeout(() => {
                setIsFolding(false);
                setView('sent');
            }, 1200);
        } catch {
            setIsFolding(false);
        }
    }, [message, isValid, isAscii, sendLetter, setView, setLastSentLetterNumber, mailbox.letterCount]);

    if (!mailbox.isOpen) {
        return (
            <div className="write-letter">
                <div className="mailbox-closed-notice">
                    <div className="closed-icon">📪</div>
                    <h2>Mailbox is Closed</h2>
                    <p>Santa's mailbox is closed for the season. Check back next year!</p>
                    <button className="btn-secondary" onClick={() => setView('home')}>Go Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="write-letter">
            <div className={`letter-desk ${isFolding ? 'folding' : ''}`}>
                <div className="desk-surface">
                    <div className="paper-container">
                        <div className="letter-paper writing-paper">
                            <div className="paper-header">
                                <span className="paper-date">
                                    {new Date().toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                            <div className="paper-greeting">Dear Santa,</div>
                            <textarea
                                className="letter-textarea"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your wishes here... What would you like for Christmas? Have you been good this year?"
                                maxLength={MAX_MESSAGE_LENGTH}
                                disabled={isPending}
                                autoFocus
                            />
                            <div className="paper-footer">
                                <span className="paper-signoff">With love and cookies 🍪</span>
                            </div>
                        </div>

                        <div className="letter-controls">
                            <div className="char-counter">
                                <span className={charCount > MAX_MESSAGE_LENGTH ? 'over-limit' : charCount > MAX_MESSAGE_LENGTH * 0.9 ? 'near-limit' : ''}>
                                    {charCount}
                                </span>
                                <span className="separator">/</span>
                                <span>{MAX_MESSAGE_LENGTH}</span>
                            </div>

                            {!isAscii && message.length > 0 && (
                                <p className="validation-error">Only ASCII characters are allowed (no emojis or special characters)</p>
                            )}

                            {error && <p className="error-message">🚫 {error}</p>}

                            <div className="button-row">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setView('home')}
                                    disabled={isPending}
                                >
                                    ← Back
                                </button>
                                <button
                                    className="btn-primary send-btn"
                                    onClick={handleSend}
                                    disabled={!isValid || !isAscii || isPending}
                                >
                                    {isPending ? (
                                        <span className="sending">
                                            <span className="sending-icon">✉️</span>
                                            Sending to North Pole...
                                        </span>
                                    ) : (
                                        <span>📮 Send to Santa</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
