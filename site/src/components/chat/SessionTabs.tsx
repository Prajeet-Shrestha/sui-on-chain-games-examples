import { MouseEvent, useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FiMessageSquare } from 'react-icons/fi';

interface Session {
  id: string;
  name: string;
}

interface SessionTabsProps {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, newName: string) => void;
}

export default function SessionTabs({ sessions, activeId, onSelect, onClose, onNew, onRename }: SessionTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleClose = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    onClose(id);
  };

  const handleMiddleClick = (e: MouseEvent, id: string) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(id);
    }
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="session-tabs">
      <div className="session-tabs-scroll">
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`session-tab${s.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(s.id)}
            onMouseDown={(e) => handleMiddleClick(e, s.id)}
            onDoubleClick={() => startEditing(s.id, s.name)}
          >
            <span className="session-tab-icon"><FiMessageSquare size={12} /></span>
            {editingId === s.id ? (
              <input
                ref={inputRef}
                className="session-tab-edit"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleEditKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="session-tab-name">{s.name}</span>
            )}
            {sessions.length > 1 && editingId !== s.id && (
              <span
                className="session-tab-close"
                onClick={(e) => handleClose(e, s.id)}
              >
                ✕
              </span>
            )}
          </button>
        ))}
        <button className="session-tab-new" onClick={onNew} title="New chat">
          +
        </button>
      </div>
    </div>
  );
}
