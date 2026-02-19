import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useUIStore } from './stores/uiStore';
import { useGameSession } from './hooks/useGameSession';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { WriteLetter } from './components/WriteLetter';
import { ReadLetters } from './components/ReadLetters';
import { LetterSent } from './components/LetterSent';

function App() {
    const account = useCurrentAccount();
    const { currentView } = useUIStore();
    const { data: mailbox, isLoading } = useGameSession();

    return (
        <div className="app">
            <div className="snowflakes" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="snowflake">
                        {['❄', '❅', '❆', '✦'][i % 4]}
                    </div>
                ))}
            </div>

            <Header mailbox={mailbox ?? null} />

            <main className="main-content">
                {isLoading ? (
                    <div className="loading-screen">
                        <div className="loading-spinner">🎅</div>
                        <p>Loading Santa's Mailbox...</p>
                    </div>
                ) : !account ? (
                    <div className="connect-prompt">
                        <div className="prompt-card">
                            <div className="prompt-icon">🎄</div>
                            <h2>Welcome to Dear Santa!</h2>
                            <p>Connect your wallet to write a letter to Santa Claus and read letters from others around the world.</p>
                            <ConnectButton />
                        </div>
                    </div>
                ) : currentView === 'home' ? (
                    <HomeScreen mailbox={mailbox!} />
                ) : currentView === 'write' ? (
                    <WriteLetter mailbox={mailbox!} />
                ) : currentView === 'read' ? (
                    <ReadLetters mailbox={mailbox!} />
                ) : currentView === 'sent' ? (
                    <LetterSent />
                ) : null}
            </main>

            <footer className="app-footer">
                <p>Letters are stored on the Sui blockchain forever 💎</p>
            </footer>
        </div>
    );
}

export default App;
