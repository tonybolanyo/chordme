import React, { useState } from 'react';
import { ChordProEditor, ChordProViewer } from '../components';

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>ChordPro Syntax Highlighting Demo</h1>
      <p>This demonstrates the ChordPro syntax highlighting features:</p>
      <ul>
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

      <h2>Interactive Editor</h2>
      <ChordProEditor
        value={content}
        onChange={setContent}
        rows={15}
        placeholder="Enter your ChordPro content here..."
        style={{ width: '100%', marginTop: '10px' }}
      />

      <h2>Rendered Output</h2>
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginTop: '10px',
        }}
      >
        <ChordProViewer content={content} />
      </div>

      <h2>Raw Content</h2>
      <pre
        style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
        }}
      >
        {content}
      </pre>
    </div>
  );
};

export default ChordProDemo;
