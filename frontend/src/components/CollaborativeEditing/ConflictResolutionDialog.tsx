// Conflict resolution dialog for handling concurrent edits
import React, { useState } from 'react';
import { formatRelativeTime } from '../../utils';
import type { EditOperation, DocumentState } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface ConflictResolutionProps {
  isOpen: boolean;
  onClose: () => void;
  localChanges: {
    content: string;
    version: number;
    lastModified: string;
    operations: EditOperation[];
  };
  remoteChanges: {
    content: string;
    version: number;
    lastModified: string;
    operations: EditOperation[];
    author: string;
  };
  onResolve: (resolution: 'accept-local' | 'accept-remote' | 'merge-auto' | 'merge-manual') => void;
  onMergeManual?: (mergedContent: string) => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionProps> = ({
  isOpen,
  onClose,
  localChanges,
  remoteChanges,
  onResolve,
  onMergeManual,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<string>('');
  const [manualMergeContent, setManualMergeContent] = useState('');
  const [showManualMerge, setShowManualMerge] = useState(false);

  if (!isOpen) return null;

  const handleResolve = () => {
    switch (selectedResolution) {
      case 'accept-local':
        onResolve('accept-local');
        break;
      case 'accept-remote':
        onResolve('accept-remote');
        break;
      case 'merge-auto':
        onResolve('merge-auto');
        break;
      case 'merge-manual':
        if (onMergeManual && manualMergeContent) {
          onMergeManual(manualMergeContent);
        }
        onResolve('merge-manual');
        break;
    }
    onClose();
  };

  const generateMergePreview = (): string => {
    // Simple merge strategy - in a real implementation, you'd use operational transformation
    const lines1 = localChanges.content.split('\n');
    const lines2 = remoteChanges.content.split('\n');
    
    // Basic line-by-line merge with conflict markers
    const merged: string[] = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 === line2) {
        merged.push(line1);
      } else {
        merged.push('<<<<<<< Your changes');
        merged.push(line1);
        merged.push('=======');
        merged.push(line2);
        merged.push(`>>>>>>> ${remoteChanges.author}'s changes`);
      }
    }
    
    return merged.join('\n');
  };

  const handleShowManualMerge = () => {
    setManualMergeContent(generateMergePreview());
    setShowManualMerge(true);
    setSelectedResolution('merge-manual');
  };

  return (
    <>
      <div className="conflict-dialog-overlay" onClick={onClose} />
      <div className="conflict-dialog">
        <div className="conflict-dialog-header">
          <h3 className="conflict-dialog-title">
            ⚠️ Conflicting Changes Detected
          </h3>
        </div>
        
        <div className="conflict-dialog-content">
          <p>
            Concurrent edits have been detected. Choose how to resolve the conflict:
          </p>
          
          <div className="conflict-changes">
            <div className="conflict-change">
              <div className="conflict-change-header">
                Your Changes
                <br />
                <small>Modified {formatRelativeTime(localChanges.lastModified)}</small>
              </div>
              <div className="conflict-change-content">
                {localChanges.content || '(empty)'}
              </div>
            </div>
            
            <div className="conflict-change">
              <div className="conflict-change-header">
                {remoteChanges.author}'s Changes
                <br />
                <small>Modified {formatRelativeTime(remoteChanges.lastModified)}</small>
              </div>
              <div className="conflict-change-content">
                {remoteChanges.content || '(empty)'}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h4>Resolution Options:</h4>
            
            <div style={{ margin: '1rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="resolution"
                  value="accept-local"
                  checked={selectedResolution === 'accept-local'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                />
                <div>
                  <strong>Keep My Changes</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Discard the other user's changes and keep yours.
                  </div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="resolution"
                  value="accept-remote"
                  checked={selectedResolution === 'accept-remote'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                />
                <div>
                  <strong>Accept {remoteChanges.author}'s Changes</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Discard your changes and accept theirs.
                  </div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="resolution"
                  value="merge-auto"
                  checked={selectedResolution === 'merge-auto'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                />
                <div>
                  <strong>Auto-Merge</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Automatically merge changes using operational transformation.
                  </div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="resolution"
                  value="merge-manual"
                  checked={selectedResolution === 'merge-manual'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                />
                <div>
                  <strong>Manual Merge</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Manually edit the merged content to resolve conflicts.
                  </div>
                </div>
              </label>
              
              {selectedResolution === 'merge-manual' && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="conflict-btn conflict-btn-secondary"
                    onClick={handleShowManualMerge}
                    style={{ marginBottom: '1rem' }}
                  >
                    Generate Merge Preview
                  </button>
                  
                  {showManualMerge && (
                    <div>
                      <label htmlFor="merge-content-textarea" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Edit the merged content:
                      </label>
                      <textarea
                        id="merge-content-textarea"
                        value={manualMergeContent}
                        onChange={(e) => setManualMergeContent(e.target.value)}
                        style={{
                          width: '100%',
                          height: '200px',
                          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                          fontSize: '0.85rem',
                          padding: '0.75rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          resize: 'vertical',
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                        Conflict markers: &lt;&lt;&lt;&lt;&lt;&lt;&lt; (your changes), ======= (separator), &gt;&gt;&gt;&gt;&gt;&gt;&gt; (their changes)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="conflict-actions">
          <button
            type="button"
            className="conflict-btn conflict-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="conflict-btn conflict-btn-primary"
            onClick={handleResolve}
            disabled={!selectedResolution || (selectedResolution === 'merge-manual' && !manualMergeContent)}
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </>
  );
};