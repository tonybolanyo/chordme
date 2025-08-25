import React, { useState, useRef } from 'react';
import {
  ChordProEditor,
  ChordProViewer,
  ChordPalette,
  TranspositionControls,
} from '../components';
import { transposeChordProContent } from '../services/chordService';
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

  const editorRef = useRef<HTMLTextAreaElement>(null);

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
    const transposedContent = transposeChordProContent(content, semitones);
    setContent(transposedContent);
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
          <strong>Chord Transposition:</strong> Use the transpose buttons (♭/♯)
          to transpose all chords up or down by semitones
        </li>
        <li>
          <strong>Visual Feedback:</strong> Invalid chord names are highlighted
          with red underlines
        </li>
        </ul>
      </div>

      <div className="editor-layout-responsive" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="editor-main-responsive">
          <div className="flex-responsive-md-row" style={{ 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--space-md)'
          }}>
            <h2>Interactive Editor</h2>
            <TranspositionControls
              onTranspose={handleTranspose}
            />
          </div>
          <ChordProEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            rows={15}
            placeholder="Enter your ChordPro content here..."
            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
          />

          <h2 style={{ marginTop: 'var(--space-lg)' }}>Rendered Output</h2>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginTop: 'var(--space-sm)',
            }}
          >
            <ChordProViewer content={content} />
          </div>
        </div>

        <div className="editor-sidebar-responsive">
          <div style={{ position: 'sticky', top: 'var(--space-lg)' }}>
            <ChordPalette
              onChordSelect={handleChordSelect}
            />
          </div>
        </div>
      </div>

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
