import { VscFolder, VscFolderOpened, VscFile, VscJson, VscCode, VscSymbolMisc, VscMarkdown, VscFileMedia } from 'react-icons/vsc';
import { SiTypescript, SiReact, SiCss3, SiHtml5 } from 'react-icons/si';
import type { FileNode } from '../../data/mockProject';
import type { IconType } from 'react-icons';

interface FileTreeProps {
  nodes: FileNode[];
  selectedFile: string | null;
  expandedDirs: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
  depth?: number;
}

const FILE_ICONS: Record<string, [IconType, string]> = {
  '.move':  [VscSymbolMisc, '#4fc1ff'],
  '.toml':  [VscJson,       '#9b9b9b'],
  '.json':  [VscJson,       '#f5d02e'],
  '.ts':    [SiTypescript,   '#3178c6'],
  '.tsx':   [SiReact,        '#61dafb'],
  '.js':    [VscCode,        '#f5d02e'],
  '.jsx':   [SiReact,        '#61dafb'],
  '.css':   [SiCss3,         '#1572b6'],
  '.html':  [SiHtml5,        '#e34f26'],
  '.md':    [VscMarkdown,    '#519aba'],
  '.png':   [VscFileMedia,   '#a074c4'],
  '.svg':   [VscFileMedia,   '#f5a623'],
};

function getFileIcon(name: string): [IconType, string] {
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  return FILE_ICONS[ext] || [VscFile, '#89919f'];
}

export default function FileTree({
  nodes,
  selectedFile,
  expandedDirs,
  onSelectFile,
  onToggleDir,
  depth = 0,
}: FileTreeProps) {
  return (
    <div className="file-tree-group">
      {nodes.map((node) => {
        const isDir = node.type === 'directory';
        const isExpanded = expandedDirs.has(node.path);
        const isActive = node.path === selectedFile;

        const [FileIcon, iconColor] = isDir
          ? [isExpanded ? VscFolderOpened : VscFolder, '#dcb67a']
          : getFileIcon(node.name);

        return (
          <div key={node.path}>
            <button
              className={`ide-tree-item${isActive ? ' active' : ''}`}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              onClick={() => isDir ? onToggleDir(node.path) : onSelectFile(node.path)}
            >
              {isDir ? (
                <span className="tree-chevron">{isExpanded ? '▾' : '▸'}</span>
              ) : (
                <span className="tree-chevron" style={{ visibility: 'hidden' }}>▸</span>
              )}
              <span className="tree-icon" style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
                <FileIcon size={14} />
              </span>
              <span className="tree-name">{node.name}</span>
            </button>
            {isDir && isExpanded && node.children && (
              <FileTree
                nodes={node.children}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                onSelectFile={onSelectFile}
                onToggleDir={onToggleDir}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
