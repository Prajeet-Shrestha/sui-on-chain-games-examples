import { useState } from 'react';
import { formatAddress } from '@mysten/sui/utils';
import type { SantaMailbox } from '../lib/types';
import { useUIStore } from '../stores/uiStore';

export function ReadLetters({ mailbox }: { mailbox: SantaMailbox }) {
    const { setView } = useUIStore();
    const [expandedLetter, setExpandedLetter] = useState<number | null>(null);

    const letters = [...mailbox.letters].reverse();

    function formatTime(timestamp: number): string {
        if (timestamp === 0) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return (
        <div className="read-letters">
            <div className="read-header">
                <button className="btn-secondary" onClick={() => setView('home')}>← Back</button>
                <h2>📬 Santa's Mailbox</h2>
                <span className="letter-total">{mailbox.letterCount} letter{mailbox.letterCount !== 1 ? 's' : ''}</span>
            </div>

            {letters.length === 0 ? (
                <div className="empty-mailbox">
                    <div className="empty-icon">📭</div>
                    <h3>No letters yet!</h3>
                    <p>Be the first to write to Santa!</p>
                    <button className="btn-primary" onClick={() => setView('write')}>✏️ Write a Letter</button>
                </div>
            ) : (
                <div className="letters-grid">
                    {letters.map((letter) => (
                        <div
                            key={letter.letterNumber}
                            className={`letter-card ${expandedLetter === letter.letterNumber ? 'expanded' : ''}`}
                            onClick={() => setExpandedLetter(
                                expandedLetter === letter.letterNumber ? null : letter.letterNumber
                            )}
                        >
                            <div className="letter-card-header">
                                <span className="letter-number">Letter #{letter.letterNumber}</span>
                                <span className="letter-time">{formatTime(letter.sentAt)}</span>
                            </div>
                            <div className="letter-card-body">
                                <div className="letter-paper mini-paper">
                                    <p className="letter-greeting">Dear Santa,</p>
                                    <p className="letter-message">{letter.message}</p>
                                </div>
                            </div>
                            <div className="letter-card-footer">
                                <span className="letter-sender">From: {formatAddress(letter.sender)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
