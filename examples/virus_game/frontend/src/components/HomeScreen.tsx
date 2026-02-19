import { PhaserVirus } from './PhaserVirus';

interface Props {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: Props) {
  return (
    <div className="home">
      {/* Floating virus particles */}
      <div className="home__particles">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`particle particle--${i % 4}`} />
        ))}
      </div>

      <div className="home__content">
        <div className="home__virus">
          <PhaserVirus />
        </div>
        <h1 className="home__title">VIRUS</h1>
        <p className="home__tagline">
          Infect. Spread. Dominate.
        </p>
        <p className="home__description">
          Change your color to match neighboring cells and absorb them.
          Conquer the entire grid before you run out of moves.
        </p>

        <button className="home__play-btn" onClick={onPlay}>
          <span className="home__play-btn-text">PLAY</span>
          <span className="home__play-btn-icon">▶</span>
        </button>

        {/* PTB explainer */}
        <div className="home__how">
          <h3 className="home__how-title">Powered by Programmable Transaction Blocks</h3>
          <div className="home__steps">
            <div className="home__step">
              <div className="home__step-num">1</div>
              <div className="home__step-text">
                <strong>Play locally</strong>
                <span>Pick colors, undo moves — instant feedback, zero gas</span>
              </div>
            </div>
            <div className="home__step-arrow">→</div>
            <div className="home__step">
              <div className="home__step-num">2</div>
              <div className="home__step-text">
                <strong>Submit once</strong>
                <span>All moves batched into a single on-chain transaction</span>
              </div>
            </div>
            <div className="home__step-arrow">→</div>
            <div className="home__step">
              <div className="home__step-num">3</div>
              <div className="home__step-text">
                <strong>Verified on Sui</strong>
                <span>Every move re-executed on-chain — fully verifiable</span>
              </div>
            </div>
          </div>
          <p className="home__how-note">
            100% on-chain game logic · PTB composability · 1 signature per game
          </p>
        </div>
      </div>

      <div className="home__footer">
        <span>Built on</span>
        <span className="home__sui">Sui</span>
      </div>
    </div>
  );
}
