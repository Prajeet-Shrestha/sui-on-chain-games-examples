import type { SantaMailbox } from '../lib/types';
import { formatAddress } from '@mysten/sui/utils';

export function GameBoard({ mailbox }: { mailbox: SantaMailbox }) {
    const recentLetters = [...mailbox.letters].reverse().slice(0, 5);

    return (
        <div className="game-board">
            <div className="mailbox-info">
                <h3>📬 {mailbox.season}</h3>
                <p>{mailbox.letterCount} letters received</p>
                <p>Status: {mailbox.isOpen ? '📬 Open' : '📪 Closed'}</p>
            </div>
            <div className="recent-letters">
                <h4>Recent Letters</h4>
                {recentLetters.map((letter) => (
                    <div key={letter.letterNumber} className="letter-preview">
                        <span>#{letter.letterNumber}</span>
                        <span>{letter.message.slice(0, 50)}...</span>
                        <span>{formatAddress(letter.sender)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
