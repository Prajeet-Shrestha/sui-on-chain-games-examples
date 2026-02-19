import React from 'react';
import { FiCpu, FiLoader, FiEdit3, FiUploadCloud, FiMessageCircle, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { VscBug } from 'react-icons/vsc';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Simple markdown-like rendering for code blocks
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const firstNewline = code.indexOf('\n');
        const lang = firstNewline > 0 ? code.slice(0, firstNewline).trim() : '';
        const codeContent = firstNewline > 0 ? code.slice(firstNewline + 1) : code;
        return (
          <pre key={i} className="chat-code-block">
            {lang && <span className="chat-code-lang">{lang}</span>}
            <code>{codeContent}</code>
          </pre>
        );
      }
      // Handle inline code
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={i}>
          {inlineParts.map((ip, j) => {
            if (ip.startsWith('`') && ip.endsWith('`')) {
              return <code key={j} className="chat-inline-code">{ip.slice(1, -1)}</code>;
            }
            return <span key={j}>{ip}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="chat-avatar">
          <span><FiCpu size={14} /></span>
        </div>
      )}
      <div className="chat-bubble-content">
        <div className="chat-bubble-text">{renderContent(message.content)}</div>
        <span className="chat-bubble-time">{time}</span>
      </div>
    </div>
  );
}

export type AiActivity = 'thinking' | 'writing_code' | 'debugging' | 'deploying' | 'waiting_for_user' | 'error';

const ACTIVITY_CONFIG: Record<AiActivity, { label: string; color: string; icon: React.ReactNode }> = {
  thinking:         { label: 'Thinking...',                color: '#a29bfe', icon: <FiLoader size={13} className="spin-icon" /> },
  writing_code:     { label: 'Writing code...',            color: '#f5d02e', icon: <FiEdit3 size={13} /> },
  debugging:        { label: 'Debugging...',               color: '#ff6b6b', icon: <VscBug size={13} /> },
  deploying:        { label: 'Deploying to testnet...',    color: '#f5a623', icon: <FiUploadCloud size={13} /> },
  waiting_for_user: { label: 'Waiting for your response',  color: '#4ade80', icon: <FiMessageCircle size={13} /> },
  error:            { label: 'Something went wrong',       color: '#ff4757', icon: <FiAlertTriangle size={13} /> },
};

export function ActivityIndicator({ activity, onRetry }: { activity: AiActivity; onRetry?: () => void }) {
  const config = ACTIVITY_CONFIG[activity];
  const isError = activity === 'error';
  return (
    <div className="chat-bubble ai">
      <div className="chat-avatar">
        <span><FiCpu size={14} /></span>
      </div>
      <div className="chat-bubble-content">
        <div className={`chat-activity${isError ? ' error' : ''}`} style={{ '--activity-color': config.color } as React.CSSProperties}>
          <span className="chat-activity-icon">{config.icon}</span>
          <span className="chat-activity-label">{config.label}</span>
          {!isError && (
            <span className="chat-activity-dots">
              <span></span><span></span><span></span>
            </span>
          )}
        </div>
        {isError && onRetry && (
          <button className="chat-retry-btn" onClick={onRetry}>
            <FiRefreshCw size={11} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
