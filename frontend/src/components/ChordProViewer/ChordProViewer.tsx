import React from 'react';
import './ChordProViewer.css';

interface ChordProViewerProps {
  content: string;
  showMetadata?: boolean;
  maxHeight?: string;
  className?: string;
}

interface ParsedChordPro {
  metadata: Record<string, string>;
  sections: Section[];
}

interface Section {
  type: 'verse' | 'chorus' | 'bridge' | 'content';
  name?: string;
  lines: Line[];
}

interface Line {
  type: 'lyrics' | 'comment' | 'directive';
  content: string;
  chords?: ChordPosition[];
}

interface ChordPosition {
  chord: string;
  position: number;
}

const ChordProViewer: React.FC<ChordProViewerProps> = ({
  content,
  showMetadata = true,
  maxHeight,
  className = '',
}) => {
  // Parse ChordPro content
  const parseChordPro = (text: string): ParsedChordPro => {
    const lines = text.split('\n');
    const metadata: Record<string, string> = {};
    const sections: Section[] = [];
    let currentSection: Section = {
      type: 'content',
      lines: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        currentSection.lines.push({
          type: 'lyrics',
          content: '',
        });
        continue;
      }

      // Parse directives
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const directive = trimmed.slice(1, -1);

        // Check for section start/end directives
        if (directive.startsWith('start_of_')) {
          // Start new section
          if (currentSection.lines.length > 0) {
            sections.push(currentSection);
          }
          const sectionType = directive.replace(
            'start_of_',
            ''
          ) as Section['type'];
          currentSection = {
            type:
              sectionType === 'verse' ||
              sectionType === 'chorus' ||
              sectionType === 'bridge'
                ? sectionType
                : 'content',
            name: sectionType,
            lines: [],
          };
          continue;
        } else if (directive.startsWith('end_of_')) {
          // End current section
          if (currentSection.lines.length > 0) {
            sections.push(currentSection);
          }
          currentSection = {
            type: 'content',
            lines: [],
          };
          continue;
        } else if (directive.includes(':')) {
          // Metadata directive
          const [key, ...valueParts] = directive.split(':');
          const value = valueParts.join(':').trim();
          metadata[key.trim()] = value;

          if (showMetadata) {
            currentSection.lines.push({
              type: 'directive',
              content: line,
            });
          }
          continue;
        } else {
          // Simple directive (like {chorus})
          currentSection.lines.push({
            type: 'directive',
            content: line,
          });
          continue;
        }
      }

      // Parse comments
      if (trimmed.startsWith('#')) {
        currentSection.lines.push({
          type: 'comment',
          content: line,
        });
        continue;
      }

      // Parse lines with chords and lyrics
      const chords: ChordPosition[] = [];
      let lyricsContent = line;

      // Extract chords from the line
      const chordPattern = /\[([^\]]+)\]/g;
      let match;
      let offset = 0;

      while ((match = chordPattern.exec(line)) !== null) {
        const chord = match[1];
        const chordStart = match.index;

        // Position relative to lyrics (accounting for removed chord notation)
        const lyricsPosition = chordStart - offset;

        chords.push({
          chord,
          position: lyricsPosition,
        });

        // Update offset for next chord
        offset += match[0].length;
      }

      // Remove chord notations to get clean lyrics
      lyricsContent = line.replace(/\[([^\]]+)\]/g, '');

      currentSection.lines.push({
        type: 'lyrics',
        content: lyricsContent,
        chords,
      });
    }

    // Add final section if it has content
    if (currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    return { metadata, sections };
  };

  const parsed = parseChordPro(content);

  // Render a line with chords above lyrics
  const renderLineWithChords = (line: Line, index: number) => {
    if (line.type !== 'lyrics' || !line.chords || line.chords.length === 0) {
      return (
        <div key={index} className={`chordpro-line chordpro-${line.type}`}>
          {line.content}
        </div>
      );
    }

    // Create chord and lyric segments
    const segments: { chord?: string; lyrics: string }[] = [];
    let lastPosition = 0;

    // Sort chords by position
    const sortedChords = [...line.chords].sort(
      (a, b) => a.position - b.position
    );

    for (const chordPos of sortedChords) {
      // Add lyrics segment before this chord
      if (chordPos.position > lastPosition) {
        segments.push({
          lyrics: line.content.substring(lastPosition, chordPos.position),
        });
      }

      // Add chord segment
      segments.push({
        chord: chordPos.chord,
        lyrics:
          line.content.substring(chordPos.position, chordPos.position + 1) ||
          ' ',
      });

      lastPosition = chordPos.position + 1;
    }

    // Add remaining lyrics
    if (lastPosition < line.content.length) {
      segments.push({
        lyrics: line.content.substring(lastPosition),
      });
    }

    return (
      <div key={index} className="chordpro-line chordpro-lyrics-with-chords">
        <div className="chordpro-chords-row">
          {segments.map((segment, segIndex) => (
            <span key={segIndex} className="chordpro-segment">
              <span className="chordpro-chord">{segment.chord || ''}</span>
            </span>
          ))}
        </div>
        <div className="chordpro-lyrics-row">
          {segments.map((segment, segIndex) => (
            <span key={segIndex} className="chordpro-segment">
              <span className="chordpro-lyric">{segment.lyrics}</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`chordpro-viewer ${className}`} style={{ maxHeight }}>
      {/* Metadata section */}
      {showMetadata && Object.keys(parsed.metadata).length > 0 && (
        <div className="chordpro-metadata">
          {parsed.metadata.title && (
            <h3 className="chordpro-title">{parsed.metadata.title}</h3>
          )}
          {parsed.metadata.artist && (
            <p className="chordpro-artist">by {parsed.metadata.artist}</p>
          )}
          <div className="chordpro-details">
            {parsed.metadata.key && (
              <span className="chordpro-key">Key: {parsed.metadata.key}</span>
            )}
            {parsed.metadata.capo && (
              <span className="chordpro-capo">
                Capo: {parsed.metadata.capo}
              </span>
            )}
            {parsed.metadata.tempo && (
              <span className="chordpro-tempo">
                Tempo: {parsed.metadata.tempo}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="chordpro-content">
        {parsed.sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className={`chordpro-section chordpro-section-${section.type}`}
          >
            {section.name && section.type !== 'content' && (
              <div className="chordpro-section-header">
                {section.name.charAt(0).toUpperCase() + section.name.slice(1)}
              </div>
            )}
            {section.lines.map((line, lineIndex) =>
              renderLineWithChords(line, lineIndex)
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChordProViewer;
