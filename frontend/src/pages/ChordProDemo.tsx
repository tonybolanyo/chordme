import React, { useState } from 'react';
import { ChordProEditor } from '../components';

const ChordProDemo: React.FC = () => {
  const [content, setContent] = useState(`{title: Amazing Grace}
{artist: Traditional}
{key: G}

# This is a comment - verse 1
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [D]wretch like [G]me
[G]I [G7]once was [C]lost, but [G]now am [Em]found
Was [G]blind but [D]now I [G]see

{chorus}
# Chorus section
[C]How [G]precious [Em]did [G]that [C]grace [G]appear
The [G]hour I [D]first be[G]lieved`);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>ChordPro Syntax Highlighting Demo</h1>
      <p>This demonstrates the ChordPro syntax highlighting features:</p>
      <ul>
        <li><strong>Chords</strong> in square brackets: <code>[C]</code>, <code>[G]</code>, <code>[Am]</code> - highlighted in blue</li>
        <li><strong>Directives</strong> in curly braces: <code>{`{title: Song}`}</code>, <code>{`{chorus}`}</code> - highlighted in red</li>
        <li><strong>Comments</strong> starting with #: <code># This is a comment</code> - highlighted in gray italic</li>
        <li><strong>Lyrics</strong> as regular text - highlighted in dark gray</li>
      </ul>
      
      <h2>Interactive Editor</h2>
      <ChordProEditor
        value={content}
        onChange={setContent}
        rows={15}
        placeholder="Enter your ChordPro content here..."
        style={{ width: '100%', marginTop: '10px' }}
      />
      
      <h2>Raw Content</h2>
      <pre style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto' 
      }}>
        {content}
      </pre>
    </div>
  );
};

export default ChordProDemo;