import { useState } from 'react';
import type { DiffOptions } from '../types/diff';
import type { RecentFile } from '../types/history';
import { describeRecentFile } from '../utils/history';
import { SUPPORTED_LANGUAGES } from '../utils/highlight';

interface ToolbarProps {
  options: DiffOptions;
  onOptionsChange: (options: Partial<DiffOptions>) => void;
  languageOverride: string | null;
  onLanguageChange: (language: string | null) => void;
  stats: { added: number; removed: number; modified: number; unchanged: number } | null;
  onLoadOriginal: () => void;
  onLoadChanged: () => void;
  recentFiles: RecentFile[];
  onOpenRecent: (side: 'original' | 'changed', filePath: string) => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onSwap: () => void;
  onClear: () => void;
  isComparing: boolean;
  canCompare: boolean;
  onCompare: () => void;
  onCloseDiff: () => void;
  showInput: boolean;
  onToggleInput: () => void;
  onSave: () => void;
  canMerge: boolean;
  onToggleMerge: () => void;
  mergeMode: boolean;
  isDesktop: boolean;
}

export function Toolbar({
  options,
  onOptionsChange,
  languageOverride,
  onLanguageChange,
  stats,
  onLoadOriginal,
  onLoadChanged,
  recentFiles,
  onOpenRecent,
  historyOpen,
  onToggleHistory,
  onSwap,
  onClear,
  isComparing,
  canCompare,
  onCompare,
  onCloseDiff,
  showInput,
  onToggleInput,
  onSave,
  canMerge,
  onToggleMerge,
  mergeMode,
  isDesktop,
}: ToolbarProps) {
  const [showIgnoreRules, setShowIgnoreRules] = useState(false);
  const [customIgnoreRules, setCustomIgnoreRules] = useState(options.customIgnoreRules.join('\n'));

  const handleIgnoreRulesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomIgnoreRules(e.target.value);
  };

  const applyIgnoreRules = () => {
    const rules = customIgnoreRules.split('\n').map(r => r.trim()).filter(Boolean);
    onOptionsChange({ customIgnoreRules: rules });
    setShowIgnoreRules(false);
  };

  // Picking an entry opens it; the select always snaps back to the placeholder
  const renderRecentPicker = (side: 'original' | 'changed') =>
    isDesktop && recentFiles.length > 0 && (
      <select
        className="toolbar-select toolbar-select-recent"
        aria-label={`Recent ${side} file`}
        value=""
        onChange={(e) => e.target.value && onOpenRecent(side, e.target.value)}
      >
        <option value="">Recent…</option>
        {recentFiles.map(file => (
          <option key={file.path} value={file.path} title={file.path}>{describeRecentFile(file.path)}</option>
        ))}
      </select>
    );

  return (
    <div className="toolbar">
      <div className="toolbar-group toolbar-compare">
        {isComparing ? (
          <>
            <button className="toolbar-btn" onClick={onCloseDiff} title="Close the diff and go back to the editors only">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span>Close Diff</span>
            </button>
            <button className="toolbar-btn" onClick={onToggleInput} title="Show or hide the input editors under the diff">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>{showInput ? 'Hide Input' : 'Show Input'}</span>
            </button>
          </>
        ) : (
          <button
            className="toolbar-btn toolbar-btn-primary"
            onClick={onCompare}
            disabled={!canCompare}
            title="Compare (Ctrl+Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>Compare</span>
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-file">
        <button className="toolbar-btn" onClick={onLoadOriginal} title="Load Original (Ctrl+O)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Original</span>
        </button>
        {renderRecentPicker('original')}
        <button className="toolbar-btn" onClick={onLoadChanged} title="Load Changed (Ctrl+Shift+O)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
            <path d="M14 2v4a2 2 0 0 1-2 2H4"/>
          </svg>
          <span>Changed</span>
        </button>
        {renderRecentPicker('changed')}
        <button className="toolbar-btn toolbar-btn-swap" onClick={onSwap} title="Swap original and changed files">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <polyline points="23 20 23 14 17 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <button className="toolbar-btn toolbar-btn-danger" onClick={onClear} title="Clear All (Ctrl+Shift+X)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-view">
        <button
          className={`toolbar-btn ${options.viewMode === 'side-by-side' ? 'active' : ''}`}
          onClick={() => onOptionsChange({ viewMode: 'side-by-side' })}
          title="Side by Side"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="18" rx="1"/>
            <rect x="14" y="3" width="7" height="18" rx="1"/>
          </svg>
          <span>Side-by-Side</span>
        </button>
        <button
          className={`toolbar-btn ${options.viewMode === 'unified' ? 'active' : ''}`}
          onClick={() => onOptionsChange({ viewMode: 'unified' })}
          title="Unified"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="1"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span>Unified</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-precision">
        <label className="toolbar-label">Precision:</label>
        <select
          className="toolbar-select"
          value={options.precision}
          onChange={(e) => onOptionsChange({ precision: e.target.value as DiffOptions['precision'] })}
        >
          <option value="smart">Smart</option>
          <option value="word">Word</option>
          <option value="character">Character</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-syntax">
        <label className="toolbar-label" htmlFor="syntax-select">Syntax:</label>
        <select
          id="syntax-select"
          className="toolbar-select"
          value={languageOverride ?? ''}
          onChange={(e) => onLanguageChange(e.target.value || null)}
        >
          <option value="">Auto-detect</option>
          {['plaintext', ...SUPPORTED_LANGUAGES].map(language => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-options">
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={options.ignoreWhitespace}
            onChange={(e) => onOptionsChange({ ignoreWhitespace: e.target.checked })}
          />
          <span>Ignore Whitespace</span>
        </label>
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={options.ignoreCase}
            onChange={(e) => onOptionsChange({ ignoreCase: e.target.checked })}
          />
          <span>Ignore Case</span>
        </label>
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={options.wrapLines}
            onChange={(e) => onOptionsChange({ wrapLines: e.target.checked })}
          />
          <span>Wrap Lines</span>
        </label>
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={options.hideUnchangedLines}
            onChange={(e) => onOptionsChange({ hideUnchangedLines: e.target.checked })}
          />
          <span>Hide Unchanged</span>
        </label>
      </div>

      {showIgnoreRules && (
        <div className="toolbar-group toolbar-ignore-rules">
          <textarea
            className="ignore-rules-input"
            value={customIgnoreRules}
            onChange={handleIgnoreRulesChange}
            placeholder="One pattern per line (e.g. TIMESTAMP=..., BUILD_ID=...)"
            rows={3}
          />
          <div className="ignore-rules-actions">
            <button className="toolbar-btn toolbar-btn-primary" onClick={applyIgnoreRules}>Apply</button>
            <button className="toolbar-btn" onClick={() => setShowIgnoreRules(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-actions">
        <button className="toolbar-btn" onClick={() => setShowIgnoreRules(true)} title="Custom Ignore Rules">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Ignore Rules</span>
        </button>
        
        {canMerge && (
          <button
            className={`toolbar-btn ${mergeMode ? 'active' : ''}`}
            onClick={onToggleMerge}
            title={mergeMode ? 'Exit Merge Mode' : 'Enter Merge Mode'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>{mergeMode ? 'Exit Merge' : 'Merge Mode'}</span>
          </button>
        )}

        {isDesktop && (
          <>
            <button
              className={`toolbar-btn ${historyOpen ? 'active' : ''}`}
              onClick={onToggleHistory}
              title="Past comparisons"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>History</span>
            </button>
            <button className="toolbar-btn toolbar-btn-primary" onClick={onSave} title="Save (Ctrl+S)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Save</span>
            </button>
          </>
        )}
      </div>

      {stats && (
        <div className="toolbar-group toolbar-stats">
          <span className="stat stat-added">+{stats.added}</span>
          <span className="stat stat-removed">-{stats.removed}</span>
          <span className="stat stat-modified">~{stats.modified}</span>
          <span className="stat stat-unchanged">{stats.unchanged} unchanged</span>
        </div>
      )}
    </div>
  );
}
