import type { SantaMailbox } from '../lib/types';
import { useUIStore } from '../stores/uiStore';

export function HomeScreen({ mailbox }: { mailbox: SantaMailbox }) {
    const { setView } = useUIStore();

    return (
        <div className="home-screen">
            <div className="hero-section">
                <div className="hero-envelope">
                    <div className="envelope-body">
                        <div className="envelope-flap"></div>
                        <div className="envelope-letter">
                            <p>Dear Santa...</p>
                        </div>
                    </div>
                </div>
                <h2 className="hero-title">Write a Letter to Santa 🎄</h2>
                <p className="hero-subtitle">
                    Season: <strong>{mailbox.season}</strong>
                </p>
                <p className="hero-description">
                    Send your wishes to Santa Claus! Every letter is stored on the Sui blockchain
                    — permanent, transparent, and magical. ✨
                </p>
            </div>

            <div className="action-cards">
                <button
                    className="action-card write-card"
                    onClick={() => setView('write')}
                    disabled={!mailbox.isOpen}
                >
                    <div className="card-icon">✏️</div>
                    <h3>Write a Letter</h3>
                    <p>{mailbox.isOpen ? 'Tell Santa your wishes!' : 'Mailbox is closed for the season'}</p>
                </button>

                <button
                    className="action-card read-card"
                    onClick={() => setView('read')}
                >
                    <div className="card-icon">📖</div>
                    <h3>Read Letters</h3>
                    <p>See what others wished for ({mailbox.letterCount} letters)</p>
                </button>
            </div>

            {mailbox.letters.length > 0 && (
                <div className="recent-preview">
                    <h3>Latest Letter</h3>
                    <div className="preview-letter">
                        <div className="letter-paper">
                            <p className="letter-text">"{mailbox.letters[mailbox.letters.length - 1].message}"</p>
                            <p className="letter-meta">
                                — Letter #{mailbox.letters[mailbox.letters.length - 1].letterNumber}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
