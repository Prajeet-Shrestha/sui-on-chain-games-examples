import { useEffect, useRef } from 'react';
import { VscFolder } from 'react-icons/vsc';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
// Language support
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-bash';

interface CodeViewerProps {
  filePath: string | null;
  content: string | null;
}

const EXT_TO_LANG: Record<string, string> = {
  '.move': 'rust',       // Move is Rust-like
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.json': 'json',
  '.toml': 'toml',
  '.css': 'css',
  '.html': 'markup',
  '.md': 'markdown',
  '.sh': 'bash',
};

function getLang(filePath: string): string {
  const ext = '.' + filePath.split('.').pop();
  return EXT_TO_LANG[ext] || 'plaintext';
}

export default function CodeViewer({ filePath, content }: CodeViewerProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current && content) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, filePath]);

  if (!filePath || content === null) {
    return (
      <div className="ide-code-viewer">
        <div className="ide-code-empty">
          <div className="ide-code-empty-icon"><VscFolder size={36} /></div>
          <p className="ide-code-empty-title">Select a file to view</p>
          <p className="ide-code-empty-sub">Click on any file in the tree to see its contents</p>
        </div>
      </div>
    );
  }

  const lines = content.split('\n');
  const lang = getLang(filePath);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ide-code-viewer">
      <div className="ide-code-header">
        <div className="ide-code-path">
          {filePath.split('/').map((part, i, arr) => (
            <span key={i}>
              <span className={i === arr.length - 1 ? 'ide-path-file' : 'ide-path-dir'}>
                {part}
              </span>
              {i < arr.length - 1 && <span className="ide-path-sep">/</span>}
            </span>
          ))}
        </div>
        <div className="ide-code-header-right">
          <span className="ide-lang-badge">{lang}</span>
          <button className={`ide-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Copy to clipboard">
            {copied ? <><FiCheck size={12} /> Copied</> : <FiCopy size={12} />}
          </button>
        </div>
      </div>
      <div className="ide-code-content">
        <div className="ide-line-numbers">
          {lines.map((_, i) => (
            <div key={i} className="ide-line-num">{i + 1}</div>
          ))}
        </div>
        <pre className="ide-code-pre">
          <code ref={codeRef} className={`language-${lang}`}>
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
}
