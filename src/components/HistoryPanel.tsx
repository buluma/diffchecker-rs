import type { HistoryEntry } from '../types/history';
import { describeSide } from '../utils/history';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  saveHistory: boolean;
  onToggleSave: (enabled: boolean) => void;
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function HistoryPanel({ entries, saveHistory, onToggleSave, onRestore, onRemove, onClear, onClose }: HistoryPanelProps) {
  return (
    <aside className="history-panel" aria-label="History">
      <div className="history-header">
        <h2>History</h2>
        <div className="history-header-actions">
          {entries.length > 0 && (
            <button className="toolbar-btn toolbar-btn-danger" onClick={onClear}>Clear history</button>
          )}
          <button className="toolbar-btn" onClick={onClose} aria-label="Close history">✕</button>
        </div>
      </div>

      <label className="history-save-toggle">
        <input type="checkbox" checked={saveHistory} onChange={(e) => onToggleSave(e.target.checked)} />
        Save comparisons to history
      </label>
      {!saveHistory && (
        <p className="history-note">New comparisons are not being saved. Entries already here stay until you delete them.</p>
      )}

      {entries.length === 0 ? (
        <p className="history-empty">
          {saveHistory ? 'No history yet. Comparisons are saved here when you press Compare.' : 'No saved comparisons.'}
        </p>
      ) : (
        <ul className="history-list">
          {entries.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-item-text">
                <span className="history-item-time">{new Date(entry.createdAt).toLocaleString()}</span>
                <span className="history-item-side">
                  <span className="history-item-mark history-item-mark-original">−</span>{describeSide(entry.original)}
                </span>
                <span className="history-item-side">
                  <span className="history-item-mark history-item-mark-changed">+</span>{describeSide(entry.changed)}
                </span>
              </div>
              <div className="history-item-actions">
                <button className="toolbar-btn toolbar-btn-primary" onClick={() => onRestore(entry)}>Restore</button>
                <button className="toolbar-btn" onClick={() => onRemove(entry.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
