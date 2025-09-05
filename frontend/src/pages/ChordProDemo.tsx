import React, { useState, useRef } from 'react';
import {
  ChordProEditor,
  ChordProViewer,
  ChordPalette,
  TranspositionControls,
  SplitViewLayout,
  ViewModeSelector,
} from '../components';
import { 
  transposeChordProContent,
  transposeChordProContentWithKey,
  detectKeySignature
} from '../services/chordService';
import { useSplitView } from '../hooks/useSplitView';
import { useSyncedScrolling } from '../hooks/useSyncedScrolling';
import { NotationSystem } from '../components/TranspositionControls/TranspositionControls';
import '../styles/responsive.css';

const ChordProDemo: React.FC = () => {
  const [content, setContent] = useState(`{title: Amazing Grace}
{artist: Traditional}
{key: G}
{capo: 0}
{tempo: 90}

{start_of_verse}
# Verse 1
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
[G]I [G7]once was [C]lost, but [G]now I'm [Em]found
Was [G]blind but [D]now I [G]see
{end_of_verse}

{start_of_chorus}
[C]How [G]precious [Em]did [G]that [C]grace [G]appear
The [G]hour I [D]first be[G]lieved
{end_of_chorus}

{start_of_verse}
# Verse 2
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re[D]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved
{end_of_verse}`);

  // Transposition state management
  const [originalContent] = useState(content);
  const [currentTransposition, setCurrentTransposition] = useState(0);
  const [originalKey] = useState('G');
  const [currentKey, setCurrentKey] = useState('G');
  const [notationSystem, setNotationSystem] = useState<NotationSystem>('american');
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  // Split view configuration
  const { config, setViewMode, setSplitOrientation, setSplitRatio } = useSplitView({
    defaultViewMode: 'split',
    defaultSplitOrientation: 'vertical',
    defaultSplitRatio: 0.5,
  });

  // Synchronized scrolling
  const { editorRef: syncedEditorRef, previewRef: syncedPreviewRef } = useSyncedScrolling({
    enabled: config.enableSyncedScrolling && config.viewMode === 'split',
  });

  const handleChordSelect = (chord: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentContent = content;

      // Insert chord at cursor position
      const newContent =
        currentContent.substring(0, startPos) +
        chord +
        currentContent.substring(endPos);

      setContent(newContent);

      // Move cursor after inserted chord
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          startPos + chord.length,
          startPos + chord.length
        );
      }, 0);
    }
  };

  const handleTranspose = (semitones: number) => {
    const newTransposition = currentTransposition + semitones;
    setCurrentTransposition(newTransposition);
    
    const transposedContent = transposeChordProContentWithKey(
      originalContent, 
      newTransposition,
      originalKey,
      notationSystem
    );
    setContent(transposedContent);
    
    // Calculate new key for display
    const detectedKey = detectKeySignature(transposedContent);
    setCurrentKey(detectedKey.detectedKey);
  };

  const handleKeyChange = (key: string) => {
    setCurrentKey(key);
    // Update the content's key directive
    const updatedContent = content.replace(
      /\{key\s*:\s*[^}]+\}/i,
      `{key: ${key}}`
    );
    setContent(updatedContent);
  };

  const handleNotationSystemChange = (system: NotationSystem) => {
    setNotationSystem(system);
    // Re-transpose with new notation system
    const transposedContent = transposeChordProContentWithKey(
      originalContent,
      currentTransposition,
      originalKey,
      system
    );
    setContent(transposedContent);
  };

  const handleReset = () => {
    setCurrentTransposition(0);
    setCurrentKey(originalKey);
    setContent(originalContent);
  };

  return (
    <div className="container-responsive spacing-responsive">
      <h1 className="page-title">ChordPro Syntax Highlighting Demo</h1>
      <div className="text-responsive">
        <p>This demonstrates the ChordPro syntax highlighting features:</p>
        <ul style={{ marginBottom: '1rem' }}>
          <li>
            <strong>Chords</strong> in square brackets: <code>[C]</code>,{' '}
            <code>[G]</code>, <code>[Am]</code> - highlighted in blue
          </li>
          <li>
            <strong>Directives</strong> in curly braces:{' '}
            <code>{`{title: Song}`}</code>, <code>{`{chorus}`}</code> -
            highlighted in red
          </li>
          <li>
            <strong>Comments</strong> starting with #:{' '}
            <code># This is a comment</code> - highlighted in gray italic
          </li>
          <li>
            <strong>Lyrics</strong> as regular text - highlighted in dark gray
          </li>
        </ul>
        <p>
          <strong>Interactive Features:</strong>
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>
            <strong>Direct Chord Entry:</strong> Type chord names within square
            brackets <code>[Am]</code> with real-time validation
          </li>
          <li>
            <strong>Autocomplete:</strong> Start typing a chord like{' '}
            <code>[C</code> to see suggestions
          </li>
          <li>
            <strong>Chord Palette:</strong> Click any chord button to insert at
            cursor position
          </li>
          <li>
            <strong>Drag & Drop:</strong> Drag chords from the palette directly
            onto specific positions in the lyrics
          </li>
          <li>
            <strong>Chord Transposition:</strong> Use the enhanced transpose 
            controls with key selection, notation system toggle, and keyboard shortcuts
          </li>
          <li>
            <strong>Keyboard Shortcuts:</strong> Ctrl+↑/↓ for transposition, 
            Ctrl+0 for reset, Ctrl++ and Ctrl+- for quick transpose
          </li>
          <li>
            <strong>Visual Feedback:</strong> Invalid chord names are
            highlighted with red underlines
          </li>
          <li>
            <strong>Split-Screen Mode:</strong> Toggle between edit-only, preview-only, 
            and split views with synchronized scrolling
          </li>
        </ul>
      </div>

      {/* View Mode Selector */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <ViewModeSelector
          viewMode={config.viewMode}
          splitOrientation={config.splitOrientation}
          onViewModeChange={setViewMode}
          onSplitOrientationChange={setSplitOrientation}
        />
      </div>

      {/* Split View Layout */}
      <div style={{ marginTop: 'var(--space-lg)', height: '80vh' }}>
        <SplitViewLayout
          viewMode={config.viewMode}
          splitOrientation={config.splitOrientation}
          splitRatio={config.splitRatio}
          onSplitRatioChange={setSplitRatio}
          editorContent={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 'var(--space-md)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                }}
              >
                <h2 style={{ margin: 0 }}>Editor</h2>
                <TranspositionControls 
                  onTranspose={handleTranspose}
                  onKeyChange={handleKeyChange}
                  onNotationSystemChange={handleNotationSystemChange}
                  onReset={handleReset}
                  currentTransposition={currentTransposition}
                  originalKey={originalKey}
                  currentKey={currentKey}
                  notationSystem={notationSystem}
                  enableAdvancedFeatures={true}
                />
              </div>
              <ChordProEditor
                ref={(node) => {
                  // Support both refs
                  if (editorRef) editorRef.current = node;
                  if (syncedEditorRef) syncedEditorRef.current = node;
                }}
                value={content}
                onChange={setContent}
                rows={15}
                placeholder="Enter your ChordPro content here..."
                style={{ flex: 1, width: '100%', minHeight: '300px' }}
              />
            </div>
          }
          previewContent={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h2 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Preview</h2>
              <div
                ref={syncedPreviewRef}
                style={{
                  flex: 1,
                  overflow: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                }}
              >
                <ChordProViewer content={content} />
              </div>
            </div>
          }
        />
      </div>

      {/* Transposition Demo Section */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <h2>Enhanced Transposition Features</h2>
        <div className="text-responsive">
          <p>The transposition controls offer comprehensive functionality:</p>
          <ul style={{ marginBottom: '1rem' }}>
            <li><strong>Semitone Controls:</strong> ♭/♯ buttons for precise transposition</li>
            <li><strong>Key Selection:</strong> Dropdown with all major/minor keys</li>
            <li><strong>Key Display:</strong> Shows original → current key transformation</li>
            <li><strong>Notation Toggle:</strong> Switch between American (ABC) and Latin (DoReMi) notation</li>
            <li><strong>Reset Function:</strong> Return to original key instantly</li>
            <li><strong>Keyboard Shortcuts:</strong> Ctrl+↑/↓, Ctrl+±, Ctrl+0</li>
            <li><strong>Smart Enharmonics:</strong> Context-aware sharp/flat preferences</li>
          </ul>
        </div>
        
        {/* Standalone Transposition Controls Demo */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: 'var(--space-lg)', 
          backgroundColor: '#fafafa',
          marginTop: 'var(--space-md)'
        }}>
          <h3 style={{ marginTop: 0 }}>Standalone Transposition Controls</h3>
          <p style={{ marginBottom: 'var(--space-md)', color: '#666' }}>
            Try all the features: transpose, change key, toggle notation system, and reset.
          </p>
          <TranspositionControls 
            onTranspose={handleTranspose}
            onKeyChange={handleKeyChange}
            onNotationSystemChange={handleNotationSystemChange}
            onReset={handleReset}
            currentTransposition={currentTransposition}
            originalKey={originalKey}
            currentKey={currentKey}
            notationSystem={notationSystem}
            enableAdvancedFeatures={true}
          />
          <div style={{ 
            marginTop: 'var(--space-md)', 
            padding: 'var(--space-sm)', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Current State:</strong> Transposed {currentTransposition > 0 ? '+' : ''}{currentTransposition} semitones 
            {originalKey !== currentKey && ` (${originalKey} → ${currentKey})`} using {notationSystem} notation
          </div>
        </div>
      </div>

      {/* Chord Palette - Show only in appropriate modes */}
      {(config.viewMode === 'edit-only' || config.viewMode === 'split') && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3>Chord Palette</h3>
          <ChordPalette onChordSelect={handleChordSelect} />
        </div>
      )}

      <h2 style={{ marginTop: 'var(--space-lg)' }}>Raw Content</h2>
      <pre
        style={{
          backgroundColor: '#f5f5f5',
          padding: 'var(--space-md)',
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          marginTop: 'var(--space-sm)',
        }}
      >
        {content}
      </pre>
    </div>
  );
};

export default ChordProDemo;
