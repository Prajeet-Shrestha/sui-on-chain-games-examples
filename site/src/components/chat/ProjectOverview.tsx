import { FiCheckCircle, FiCircle, FiLoader, FiPlay, FiUploadCloud, FiShare2, FiExternalLink, FiCode, FiLayout, FiCpu, FiBox, FiZap, FiFileText, FiTarget, FiUsers, FiLayers } from 'react-icons/fi';

type ProjectStatus = 'idle' | 'adding_code' | 'building' | 'debugging' | 'deploying' | 'ready';

interface ProjectOverviewProps {
  name: string;
  status: ProjectStatus;
  fileCount: number;
  onPlayGame: () => void;
}

const STEPS = [
  { key: 'design',   label: 'Game Design',    desc: 'Rules, mechanics & layout',        icon: FiCpu },
  { key: 'contract', label: 'Smart Contract',  desc: 'On-chain Move module',             icon: FiCode },
  { key: 'frontend', label: 'Frontend UI',     desc: 'React + wallet integration',       icon: FiLayout },
  { key: 'build',    label: 'Build & Test',    desc: 'Compile, lint & unit tests',       icon: FiBox },
  { key: 'deploy',   label: 'Deploy',          desc: 'Publish to Sui testnet',           icon: FiUploadCloud },
  { key: 'live',     label: 'Live!',           desc: 'Ready to play on-chain',           icon: FiZap },
];

const STATUS_TO_STEP: Record<ProjectStatus, number> = {
  idle: 0,
  adding_code: 2,
  building: 3,
  debugging: 3,
  deploying: 4,
  ready: 6,
};

const FEATURES = [
  { label: 'On-chain game logic',  done: true },
  { label: 'Two-player support',   done: true },
  { label: 'Win detection',        done: true },
  { label: 'Wallet integration',   done: true },
  { label: 'Responsive UI',        done: true },
  { label: 'Testnet deployment',   done: false },
];

function ProgressRing({ percent }: { percent: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="po-ring-wrap">
      <svg className="po-ring" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} className="po-ring-bg" />
        <circle
          cx="44" cy="44" r={r}
          className="po-ring-fill"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="po-ring-text">
        <span className="po-ring-pct">{Math.round(percent)}%</span>
        <span className="po-ring-sub">complete</span>
      </div>
    </div>
  );
}

export default function ProjectOverview({ name, status, fileCount, onPlayGame }: ProjectOverviewProps) {
  const currentStep = STATUS_TO_STEP[status];
  const percent = (currentStep / STEPS.length) * 100;
  const featsDone = FEATURES.filter(f => f.done).length;

  return (
    <div className="project-overview">
      {/* Header with progress ring */}
      <div className="po-hero">
        <ProgressRing percent={percent} />
        <div className="po-hero-info">
          <h2 className="po-title">{name}</h2>
          <p className="po-subtitle">On-chain Sui Move Game</p>
          <div className="po-chips">
            <span className="po-chip"><FiCode size={10} /> {fileCount} files</span>
            <span className="po-chip"><FiCheckCircle size={10} /> {featsDone}/{FEATURES.length} features</span>
          </div>
        </div>
      </div>

      {/* Step cards */}
      <div className="po-section">
        <h3 className="po-section-title">Build Progress</h3>
        <div className="po-steps">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep && status !== 'ready';
            const Icon = step.icon;
            return (
              <div key={step.key} className={`po-step-card${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                <div className="po-step-card-icon">
                  {isDone ? <FiCheckCircle size={16} /> : isActive ? <FiLoader size={16} className="spin-icon" /> : <Icon size={16} />}
                </div>
                <div className="po-step-card-body">
                  <span className="po-step-card-label">{step.label}</span>
                  <span className="po-step-card-desc">{step.desc}</span>
                </div>
                {isDone && <span className="po-step-badge done">Done</span>}
                {isActive && <span className="po-step-badge active">In Progress</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Design Document */}
      <div className="po-section">
        <h3 className="po-section-title">Game Design Document</h3>
        <div className="po-gdd">
          <div className="po-gdd-card">
            <div className="po-gdd-card-header">
              <FiFileText size={14} />
              <span>Overview</span>
            </div>
            <p className="po-gdd-text">
              A classic Sokoban puzzle game built fully on-chain. Players push crates onto target locations in a warehouse grid. 
              Each move is recorded as an on-chain transaction, ensuring fully verifiable gameplay.
            </p>
          </div>

          <div className="po-gdd-card">
            <div className="po-gdd-card-header">
              <FiTarget size={14} />
              <span>Core Mechanics</span>
            </div>
            <ul className="po-gdd-list">
              <li>Grid-based movement (up, down, left, right)</li>
              <li>Crate pushing — one crate at a time</li>
              <li>Win condition: all crates on targets</li>
              <li>Move counter & undo support</li>
              <li>Multiple puzzle levels with difficulty progression</li>
            </ul>
          </div>

          <div className="po-gdd-card">
            <div className="po-gdd-card-header">
              <FiUsers size={14} />
              <span>Player Flow</span>
            </div>
            <ol className="po-gdd-list ordered">
              <li>Connect Sui wallet</li>
              <li>Select level from level picker</li>
              <li>Solve puzzle by pushing all crates to targets</li>
              <li>Score saved on-chain with move count</li>
              <li>Unlock next level on completion</li>
            </ol>
          </div>

          <div className="po-gdd-card">
            <div className="po-gdd-card-header">
              <FiLayers size={14} />
              <span>Tech Stack</span>
            </div>
            <div className="po-gdd-tags">
              <span className="po-gdd-tag">Sui Move</span>
              <span className="po-gdd-tag">React</span>
              <span className="po-gdd-tag">TypeScript</span>
              <span className="po-gdd-tag">@mysten/dapp-kit</span>
              <span className="po-gdd-tag">Entity-Component-System</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="po-section">
        <h3 className="po-section-title">Features</h3>
        <div className="po-features">
          {FEATURES.map((f, i) => (
            <div key={i} className={`po-feature${f.done ? ' done' : ''}`}>
              {f.done ? <FiCheckCircle size={13} /> : <FiCircle size={13} />}
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="po-actions">
        <button className="po-action-btn primary" onClick={onPlayGame}>
          <FiPlay size={14} /> Play Game
        </button>
        <button className="po-action-btn secondary">
          <FiUploadCloud size={14} /> Deploy to Testnet
        </button>
        <div className="po-action-row">
          <button className="po-action-btn ghost">
            <FiShare2 size={13} /> Share
          </button>
          <a
            href="https://sui-on-chain-games-examples.vercel.app/sokoban/"
            target="_blank"
            rel="noopener noreferrer"
            className="po-action-btn ghost"
          >
            <FiExternalLink size={13} /> Open Live
          </a>
        </div>
      </div>
    </div>
  );
}
