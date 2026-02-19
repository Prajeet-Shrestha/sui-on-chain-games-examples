import { useUIStore } from '../stores/uiStore';

export function GameOver() {
    const { setView } = useUIStore();

    return (
        <div className="game-over">
            <h2>🎄 Season's Over!</h2>
            <p>Santa's mailbox is closed. Thank you for all the wonderful letters!</p>
            <button className="btn-primary" onClick={() => setView('read')}>
                📖 Read All Letters
            </button>
        </div>
    );
}
