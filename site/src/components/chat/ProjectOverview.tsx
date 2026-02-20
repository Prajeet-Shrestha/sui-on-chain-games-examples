import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FiCheckCircle, FiLoader, FiPlay, FiUploadCloud, FiShare2, FiExternalLink, FiCode, FiLayout, FiCpu, FiBox, FiZap, FiFileText } from 'react-icons/fi';
import type { DocFile } from '../../pages/ChatPage';

type ProjectStatus = 'idle' | 'adding_code' | 'building' | 'debugging' | 'deploying' | 'ready';

interface ProjectOverviewProps {
  name: string;
  status: ProjectStatus;
  fileCount: number;
  docs: DocFile[];
  isProjectPlayable: boolean;
  isProjectBuildable: boolean;
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

export default function ProjectOverview({ name, status, fileCount, docs, isProjectPlayable, isProjectBuildable, onPlayGame }: ProjectOverviewProps) {
  const currentStep = STATUS_TO_STEP[status];
  const percent = (currentStep / STEPS.length) * 100;
  const featsDone = FEATURES.filter(f => f.done).length;
  const [activeDoc, setActiveDoc] = useState(0);

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
            {docs.length > 0 && <span className="po-chip"><FiFileText size={10} /> {docs.length} docs</span>}
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="po-actions">
        <button
          className="po-action-btn primary"
          onClick={onPlayGame}
          disabled={!isProjectPlayable}
          style={!isProjectPlayable ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
          <FiPlay size={14} /> Play Game
        </button>
        <button
          className="po-action-btn secondary"
          disabled={!isProjectBuildable}
          style={!isProjectBuildable ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
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

      {/* Documents */}
      {docs.length > 0 && (
        <div className="po-section po-section-grow">
          <h3 className="po-section-title">Documents</h3>
          <div className="po-doc-tabs">
            {docs.map((doc, i) => (
              <button
                key={i}
                className={`po-doc-tab${activeDoc === i ? ' active' : ''}`}
                onClick={() => setActiveDoc(i)}
              >
                <FiFileText size={11} />
                {doc.title}
              </button>
            ))}
          </div>
          <div className="po-doc-content">
            <ReactMarkdown>{docs[activeDoc].content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
