import { useUIStore } from '../stores/uiStore';

export function LetterSent() {
    const { setView, lastSentLetterNumber } = useUIStore();

    return (
        <div className="letter-sent">
            <div className="sent-animation">
                <div className="flying-envelope">
                    <span className="envelope-emoji">✉️</span>
                </div>
                <div className="destination">
                    <span className="north-pole">🏔️ North Pole</span>
                </div>
            </div>

            <div className="sent-content">
                <h2>Letter Delivered! 🎉</h2>
                {lastSentLetterNumber && (
                    <p className="letter-id">Your letter is #{lastSentLetterNumber} in Santa's mailbox</p>
                )}
                <p className="sent-description">
                    Your letter has been delivered to Santa's mailbox on the Sui blockchain.
                    It will be there forever — Santa will definitely read it! 🎅
                </p>

                <div className="sent-actions">
                    <button className="btn-primary" onClick={() => setView('write')}>
                        ✏️ Write Another
                    </button>
                    <button className="btn-secondary" onClick={() => setView('read')}>
                        📖 Read All Letters
                    </button>
                    <button className="btn-ghost" onClick={() => setView('home')}>
                        🏠 Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}
