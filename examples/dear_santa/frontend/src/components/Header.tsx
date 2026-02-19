import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import type { SantaMailbox } from '../lib/types';
import { useUIStore } from '../stores/uiStore';

export function Header({ mailbox }: { mailbox: SantaMailbox | null }) {
    const account = useCurrentAccount();
    const { setView, currentView } = useUIStore();

    return (
        <header className="app-header">
            <div className="header-left">
                <h1 className="app-title" onClick={() => setView('home')}>
                    <span className="title-icon">🎅</span>
                    <span className="title-text">Dear Santa</span>
                </h1>
                {mailbox && (
                    <div className="header-stats">
                        <span className="stat-badge">
                            ✉️ {mailbox.letterCount} letter{mailbox.letterCount !== 1 ? 's' : ''}
                        </span>
                        <span className={`stat-badge ${mailbox.isOpen ? 'open' : 'closed'}`}>
                            {mailbox.isOpen ? '📬 Open' : '📪 Closed'}
                        </span>
                    </div>
                )}
            </div>
            <div className="header-right">
                {account && (
                    <nav className="header-nav">
                        <button
                            className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
                            onClick={() => setView('home')}
                        >
                            🏠 Home
                        </button>
                        <button
                            className={`nav-btn ${currentView === 'write' ? 'active' : ''}`}
                            onClick={() => setView('write')}
                        >
                            ✏️ Write
                        </button>
                        <button
                            className={`nav-btn ${currentView === 'read' ? 'active' : ''}`}
                            onClick={() => setView('read')}
                        >
                            📖 Read
                        </button>
                    </nav>
                )}
                <ConnectButton />
            </div>
        </header>
    );
}
