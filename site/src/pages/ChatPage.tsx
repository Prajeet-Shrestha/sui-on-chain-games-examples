import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SessionTabs from '../components/chat/SessionTabs';
import FileTree from '../components/chat/FileTree';
import CodeViewer from '../components/chat/CodeViewer';
import ProjectOverview from '../components/chat/ProjectOverview';
import ChatMessage, { ActivityIndicator } from '../components/chat/ChatMessage';
import type { Message, AiActivity } from '../components/chat/ChatMessage';
import { SOKOBAN_FILES } from '../data/sokobanProject';
import { buildFileTree } from '../data/mockProject';
import type { FileNode } from '../data/mockProject';
import { VscFiles, VscBug } from 'react-icons/vsc';
import { FiPause, FiEdit3, FiPackage, FiRadio, FiCheckCircle, FiZap, FiPlay, FiX, FiExternalLink } from 'react-icons/fi';
import type { ReactNode } from 'react';

type ProjectStatus = 'idle' | 'adding_code' | 'building' | 'debugging' | 'deploying' | 'ready';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: ReactNode; pulse?: boolean }> = {
  idle:        { label: 'Waiting',                     color: '#4b515b', icon: <FiPause size={12} /> },
  adding_code: { label: 'Adding codes',                color: '#f5d02e', icon: <FiEdit3 size={12} />, pulse: true },
  building:    { label: 'Building',                    color: '#6c5ce7', icon: <FiPackage size={12} />, pulse: true },
  debugging:   { label: 'Debugging',                   color: '#ff6b6b', icon: <VscBug size={12} />, pulse: true },
  deploying:   { label: 'Waiting for contract deploy', color: '#f5a623', icon: <FiRadio size={12} />, pulse: true },
  ready:       { label: 'Ready to play',               color: '#4ade80', icon: <FiCheckCircle size={12} /> },
};

export interface DocFile {
  title: string;
  content: string;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  projectFiles: typeof SOKOBAN_FILES;
  status: ProjectStatus;
  docs: DocFile[];
  isProjectPlayable: boolean;
  isProjectBuildable: boolean;
}

const AI_RESPONSES = [
  "I'll create a **Tic-Tac-Toe** game for you! Let me set up the project structure with a Move smart contract and a React frontend.\n\nI'm generating the following files:\n- `Move.toml` — package manifest\n- `sources/game.move` — the on-chain game logic\n- `sources/tests.move` — unit tests\n- `ui/` — React frontend with wallet integration",
  "The smart contract is ready! Here's what I built:\n\n- A `Board` struct with a 3×3 grid stored on-chain\n- `create_game()` to start a new match\n- `make_move()` with turn validation and win detection\n\nYou can see the code in the file explorer on the left. Click on `sources/game.move` to view the full implementation.",
  "The frontend is set up with `@mysten/dapp-kit` for wallet integration. The UI renders a 3×3 grid and calls `make_move` on each click.\n\nWant me to:\n1. Add animations for moves?\n2. Add a game lobby system?\n3. Deploy to testnet?",
  "Great choice! I'll add smooth CSS animations for placing X and O marks, plus a celebration effect when someone wins. Let me update the frontend...",
  "I've updated the component with:\n- Fade-in animation for new marks\n- Pulse effect on the winning line\n- Confetti particles on game end\n\nCheck `ui/src/App.tsx` for the updated code. Want to deploy this to Sui testnet?",
];

let sessionCounter = 1;

function createSession(name?: string): Session {
  const id = `session-${Date.now()}-${sessionCounter}`;
  sessionCounter++;
  return {
    id,
    name: name || `Game ${sessionCounter - 1}`,
    messages: [
      {
        id: `msg-${id}-welcome`,
        role: 'ai',
        content: "Hey! I'm your on-chain game builder. Tell me what game you'd like to create and I'll generate the Move smart contract and React frontend for you.\n\nTry something like:\n- \"Build me a tic-tac-toe game\"\n- \"Create a coin flip betting game\"\n- \"Make an on-chain puzzle game\"",
        timestamp: new Date(),
      },
    ],
    projectFiles: [],
    status: 'idle',
    docs: [],
    isProjectPlayable: false,
    isProjectBuildable: false,
  };
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      ...createSession('Sokoban'),
      projectFiles: SOKOBAN_FILES,
      status: 'ready',
      isProjectPlayable: true,
      isProjectBuildable: true,
      docs: [
        {
          title: 'Game Design',
          content: `# Sokoban — On-Chain Puzzle Game

## Overview
A classic Sokoban puzzle game built fully on-chain with Sui Move. Players push crates onto target locations in a warehouse grid. Each move is recorded as an on-chain transaction.

## Core Mechanics
- **Grid-based movement** — up, down, left, right
- **Crate pushing** — one crate at a time, cannot pull
- **Win condition** — all crates placed on target tiles
- **Move counter** — tracks total moves per level
- **Undo support** — revert last move on-chain

## Difficulty Progression
| Level | Grid Size | Crates | Complexity |
|-------|-----------|--------|------------|
| 1-3   | 5×5       | 1-2    | Tutorial   |
| 4-7   | 7×7       | 2-3    | Easy       |
| 8-12  | 9×9       | 3-4    | Medium     |
| 13+   | 11×11     | 4+     | Hard       |`,
        },
        {
          title: 'Player Flow',
          content: `# Player Flow

## Getting Started
1. Connect your **Sui wallet** (Slush, Sui Wallet, or ZK Login)
2. Select a level from the **level picker**
3. Solve the puzzle by pushing crates to targets
4. Your score (move count) is **saved on-chain**
5. Unlock the **next level** on completion

## Wallet Integration
- Uses \`@mysten/dapp-kit\` for wallet connection
- Each move calls \`make_move()\` on the smart contract
- Gas fees are minimal (~0.001 SUI per move)

## Scoring
- **Best score** = fewest moves to complete a level
- Scores are stored in a shared object on-chain
- Global leaderboard ranks players by total stars`,
        },
        {
          title: 'Technical Architecture',
          content: `# Technical Architecture

## Smart Contract (Move)
\`\`\`
tic_tac_toe/
├── Move.toml
└── sources/
    ├── game.move        # Core game logic
    └── tests.move       # Unit tests
\`\`\`

## Frontend (React)
\`\`\`
ui/
├── package.json
├── src/
│   ├── App.tsx          # Game board component
│   ├── main.tsx         # Entry point w/ wallet provider
│   └── index.css        # Styles
└── index.html
\`\`\`

## Key Dependencies
- **Sui Move** — on-chain game state & logic
- **React 19** — UI rendering
- **@mysten/dapp-kit** — wallet connect & TX signing
- **Entity-Component-System** — game architecture pattern`,
        },
      ],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [inputValue, setInputValue] = useState('');
  const [aiActivity, setAiActivity] = useState<AiActivity | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['sources', 'ui', 'ui/src']));
  const [chatWidth, setChatWidth] = useState(420);
  const [showPreview, setShowPreview] = useState(false);
  const [ideTab, setIdeTab] = useState<'overview' | 'code'>('overview');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiResponseIndex = useRef(0);
  const isResizing = useRef(false);

  // Resize handler for chat panel
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setChatWidth(Math.max(280, Math.min(700, newWidth)));
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = () => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  const fileTree: FileNode[] = useMemo(
    () => buildFileTree(activeSession.projectFiles),
    [activeSession.projectFiles],
  );

  const selectedFileContent = useMemo(() => {
    if (!selectedFile) return null;
    const file = activeSession.projectFiles.find((f) => f.path === selectedFile);
    return file?.content ?? null;
  }, [selectedFile, activeSession.projectFiles]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, aiActivity]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || aiActivity) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMsg] }
          : s,
      ),
    );
    setInputValue('');
    setAiActivity('thinking');

    // Progress status based on response index
    const statusFlow: ProjectStatus[] = ['adding_code', 'building', 'debugging', 'deploying', 'ready'];
    const currentStatus = statusFlow[aiResponseIndex.current % statusFlow.length];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, status: currentStatus }
          : s,
      ),
    );

    // Cycle through activity states
    const activityFlow: AiActivity[] = ['thinking', 'writing_code', 'debugging'];
    let step = 0;
    const activityInterval = setInterval(() => {
      step++;
      if (step < activityFlow.length) {
        setAiActivity(activityFlow[step]);
      }
    }, 800);

    // Simulated AI response
    setTimeout(() => {
      clearInterval(activityInterval);
      const aiText = AI_RESPONSES[aiResponseIndex.current % AI_RESPONSES.length];
      aiResponseIndex.current++;

      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'ai',
        content: aiText,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, aiMsg],
                projectFiles: SOKOBAN_FILES,
              }
            : s,
        ),
      );
      setAiActivity(null);
    }, 2500 + Math.random() * 1000);
  }, [inputValue, aiActivity, activeSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewSession = () => {
    const newSession = createSession();
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setSelectedFile(null);
  };

  const handleCloseSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh = createSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
    setSelectedFile(null);
  };

  const handleToggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleRenameSession = (id: string, newName: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s)),
    );
  };

  return (
    <div className="chat-page">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/" className="logo">
          <img src="/logo_full.png" alt="Makara Gaming" className="logo-img" />
        </Link>

        <div className="chat-nav-center">
          <span className="chat-nav-label"><FiZap size={14} style={{ marginRight: 4 }} /> Game Builder</span>
        </div>

        <div className="nav-right-chat">
          <Link to="/" className="back-home-btn">← Games</Link>
        </div>
      </nav>

      {/* Session Tabs */}
      <SessionTabs
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={(id) => { setActiveSessionId(id); setSelectedFile(null); }}
        onClose={handleCloseSession}
        onNew={handleNewSession}
        onRename={handleRenameSession}
      />

      {/* Main Content */}
      <div className="chat-content">
        {/* IDE Panel (Left) */}
        <div className="ide-panel">
          {/* IDE Tab Switcher */}
          <div className="ide-tab-bar">
            <button
              className={`ide-tab-btn${ideTab === 'overview' ? ' active' : ''}`}
              onClick={() => setIdeTab('overview')}
            >
              Overview
            </button>
            <button
              className={`ide-tab-btn${ideTab === 'code' ? ' active' : ''}`}
              onClick={() => setIdeTab('code')}
            >
              Code
            </button>
          </div>

          {ideTab === 'overview' ? (
            /* Overview Panel */
            <ProjectOverview
              name={activeSession.name}
              status={activeSession.status}
              fileCount={activeSession.projectFiles.length}
              docs={activeSession.docs}
              isProjectPlayable={activeSession.isProjectPlayable}
              isProjectBuildable={activeSession.isProjectBuildable}
              onPlayGame={() => { setShowPreview(true); setIdeTab('code'); }}
            />
          ) : (
            /* Code Panel */
            <div className="ide-code-panel">
              <div className="ide-file-tree">
                <div className="ide-file-tree-header">
                  <span className="ide-file-tree-title"><VscFiles size={14} style={{ marginRight: 4 }} /> Explorer</span>
                  <span className="ide-file-tree-count">
                    {activeSession.projectFiles.length} files
                  </span>
                </div>
                {/* Project Status */}
                {activeSession.status !== 'idle' && (
                  <div
                    className={`ide-project-status${STATUS_CONFIG[activeSession.status].pulse ? ' pulse' : ''}`}
                    style={{ '--status-color': STATUS_CONFIG[activeSession.status].color } as React.CSSProperties}
                  >
                    <span className="ide-status-dot" />
                    <span className="ide-status-icon">{STATUS_CONFIG[activeSession.status].icon}</span>
                    <span className="ide-status-label">{STATUS_CONFIG[activeSession.status].label}</span>
                  </div>
                )}
                {activeSession.projectFiles.length === 0 ? (
                  <div className="ide-tree-empty">
                    <p>No files yet</p>
                    <p className="ide-tree-empty-sub">
                      Start chatting to generate project files
                    </p>
                  </div>
                ) : (
                  <>
                    <FileTree
                      nodes={fileTree}
                      selectedFile={selectedFile}
                      expandedDirs={expandedDirs}
                      onSelectFile={setSelectedFile}
                      onToggleDir={handleToggleDir}
                    />
                    <div className="ide-tree-actions">
                      <button className="ide-action-btn build">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        Build Project
                      </button>
                      <button className="ide-action-btn play" onClick={() => setShowPreview((p) => !p)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        {showPreview ? 'View Code' : 'Play Game'}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {showPreview ? (
                <div className="ide-preview">
                  <div className="ide-preview-header">
                    <span className="ide-preview-title"><FiPlay size={12} style={{ marginRight: 4 }} /> Game Preview</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <a
                        href="https://sui-on-chain-games-examples.vercel.app/sokoban/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ide-preview-newtab"
                      >
                        <FiExternalLink size={12} /> Open in new tab
                      </a>
                      <button className="ide-preview-close" onClick={() => setShowPreview(false)}><FiX size={12} /></button>
                    </div>
                  </div>
                  <iframe
                    className="ide-preview-iframe"
                    src="https://sui-on-chain-games-examples.vercel.app/sokoban/"
                    title="Game Preview"
                    allow="clipboard-write"
                  />
                </div>
              ) : (
                <CodeViewer
                  filePath={selectedFile}
                  content={selectedFileContent}
                />
              )}
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div className="chat-resize-handle" onMouseDown={startResize} />

        {/* Chat Panel (Right) */}
        <div className="chat-panel" style={{ width: chatWidth }}>
          <div className="chat-panel-header">
            <span className="chat-panel-title">{activeSession.name}</span>
            <span className="chat-panel-status">
              <span className="status-dot"></span>
              Online
            </span>
          </div>

          <div className="chat-messages">
            {activeSession.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {aiActivity && <ActivityIndicator activity={aiActivity} onRetry={() => setAiActivity(null)} />}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-bar">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the game you want to build..."
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || !!aiActivity}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Debug Toolbar */}
          <div className="debug-toolbar">
            <span className="debug-label">Debug:</span>
            {(['thinking', 'writing_code', 'debugging', 'deploying', 'waiting_for_user', 'error'] as AiActivity[]).map((state) => (
              <button
                key={state}
                className={`debug-btn${aiActivity === state ? ' active' : ''}`}
                onClick={() => setAiActivity(aiActivity === state ? null : state)}
              >
                {state.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
