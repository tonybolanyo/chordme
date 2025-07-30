import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChordProViewer from './ChordProViewer';

describe('ChordProViewer', () => {
  describe('Basic Rendering', () => {
    it('renders with empty content', () => {
      render(<ChordProViewer content="" />);
      
      const viewer = document.querySelector('.chordpro-viewer');
      expect(viewer).toHaveClass('chordpro-viewer');
    });

    it('renders with custom className', () => {
      render(<ChordProViewer content="" className="custom-class" />);
      
      const viewer = document.querySelector('.chordpro-viewer');
      expect(viewer).toHaveClass('chordpro-viewer', 'custom-class');
    });

    it('renders with custom maxHeight', () => {
      render(<ChordProViewer content="" maxHeight="500px" />);
      
      const viewer = document.querySelector('.chordpro-viewer');
      expect(viewer).toHaveStyle('max-height: 500px');
    });

    it('renders without metadata when showMetadata is false', () => {
      const content = '{title: Test Song}\n{artist: Test Artist}\nSome lyrics';
      render(<ChordProViewer content={content} showMetadata={false} />);
      
      expect(screen.queryByText('Test Song')).not.toBeInTheDocument();
      expect(screen.queryByText('by Test Artist')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Parsing', () => {
    it('displays song title', () => {
      const content = '{title: My Awesome Song}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Awesome Song');
      expect(screen.getByText('My Awesome Song')).toHaveClass('chordpro-title');
    });

    it('displays artist information', () => {
      const content = '{artist: The Beatles}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('by The Beatles')).toHaveClass('chordpro-artist');
    });

    it('displays key information', () => {
      const content = '{key: G}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Key: G')).toHaveClass('chordpro-key');
    });

    it('displays capo information', () => {
      const content = '{capo: 2}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Capo: 2')).toHaveClass('chordpro-capo');
    });

    it('displays tempo information', () => {
      const content = '{tempo: 120}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Tempo: 120')).toHaveClass('chordpro-tempo');
    });

    it('displays all metadata together', () => {
      const content = `{title: Complete Song}
{artist: Test Artist}
{key: C}
{capo: 3}
{tempo: 140}
Some lyrics`;
      
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Complete Song')).toBeInTheDocument();
      expect(screen.getByText('by Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Key: C')).toBeInTheDocument();
      expect(screen.getByText('Capo: 3')).toBeInTheDocument();
      expect(screen.getByText('Tempo: 140')).toBeInTheDocument();
    });

    it('handles metadata with colons in values', () => {
      const content = '{subtitle: A Song About: Love and Hope}\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      // Should handle the colon in the value correctly - check that it's in the directive
      expect(screen.getByText('{subtitle: A Song About: Love and Hope}')).toBeInTheDocument();
    });
  });

  describe('Content Parsing', () => {
    it('renders simple lyrics', () => {
      const content = 'Here are some simple lyrics\nOn multiple lines';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Here are some simple lyrics')).toHaveClass('chordpro-line', 'chordpro-lyrics');
      expect(screen.getByText('On multiple lines')).toHaveClass('chordpro-line', 'chordpro-lyrics');
    });

    it('renders comments', () => {
      const content = '# This is a comment\nSome lyrics';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('# This is a comment')).toHaveClass('chordpro-line', 'chordpro-comment');
    });

    it('renders directives', () => {
      const content = '{chorus}\nChorus lyrics\n{repeat}';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('{chorus}')).toHaveClass('chordpro-line', 'chordpro-directive');
      expect(screen.getByText('{repeat}')).toHaveClass('chordpro-line', 'chordpro-directive');
    });

    it('handles empty lines', () => {
      const content = 'First line\n\nThird line';
      render(<ChordProViewer content={content} />);
      
      const lines = screen.getAllByText((content, element) => 
        element?.classList.contains('chordpro-line')
      );
      expect(lines).toHaveLength(3); // Including empty line
    });
  });

  describe('Chord and Lyric Integration', () => {
    it('renders simple chords with lyrics', () => {
      const content = 'Here is [C]some lyrics with [G]chords';
      render(<ChordProViewer content={content} />);
      
      // Should have chord row and lyrics row
      expect(screen.getByText('C')).toHaveClass('chordpro-chord');
      expect(screen.getByText('G')).toHaveClass('chordpro-chord');
      
      // Check for the chord-lyrics structure
      const lineWithChords = screen.getByText('C').closest('.chordpro-line');
      expect(lineWithChords).toHaveClass('chordpro-lyrics-with-chords');
    });

    it('positions chords correctly above lyrics', () => {
      const content = '[C]Hello [G]world';
      render(<ChordProViewer content={content} />);
      
      const chordsRow = screen.getByText('C').closest('.chordpro-chords-row');
      const lyricsRow = document.querySelector('.chordpro-lyrics-row');
      
      expect(chordsRow).toBeInTheDocument();
      expect(lyricsRow).toBeInTheDocument();
      
      // Check that both are within the same line
      const parentLine = chordsRow?.parentElement;
      expect(parentLine).toContain(lyricsRow);
    });

    it('handles chords at the beginning of lines', () => {
      const content = '[Am]Starting with a chord';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Am')).toHaveClass('chordpro-chord');
      // Check that the text appears in segments due to chord processing
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('tarting with a chord')).toBeInTheDocument();
    });

    it('handles chords at the end of lines', () => {
      const content = 'Ending with a chord [D]';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('D')).toHaveClass('chordpro-chord');
      expect(screen.getByText('Ending with a chord')).toBeInTheDocument();
    });

    it('handles multiple chords close together', () => {
      const content = 'Some [C][G][Am]chords together';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('C')).toHaveClass('chordpro-chord');
      expect(screen.getByText('G')).toHaveClass('chordpro-chord');
      expect(screen.getByText('Am')).toHaveClass('chordpro-chord');
    });

    it('handles complex chord names', () => {
      const content = 'Complex [Cmaj7]chord [G/B]names [Dm7b5]here';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Cmaj7')).toHaveClass('chordpro-chord');
      expect(screen.getByText('G/B')).toHaveClass('chordpro-chord');
      expect(screen.getByText('Dm7b5')).toHaveClass('chordpro-chord');
    });
  });

  describe('Section Handling', () => {
    it('creates sections for start_of/end_of directives', () => {
      const content = `{start_of_verse}
Verse lyrics here
{end_of_verse}
{start_of_chorus}
Chorus lyrics here
{end_of_chorus}`;
      
      render(<ChordProViewer content={content} />);
      
      const verseSections = screen.getAllByText((content, element) => 
        element?.classList.contains('chordpro-section-verse')
      );
      const chorusSections = screen.getAllByText((content, element) => 
        element?.classList.contains('chordpro-section-chorus')
      );
      
      expect(verseSections.length).toBeGreaterThan(0);
      expect(chorusSections.length).toBeGreaterThan(0);
    });

    it('displays section headers', () => {
      const content = `{start_of_verse}
Verse content
{end_of_verse}`;
      
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Verse')).toHaveClass('chordpro-section-header');
    });

    it('handles bridge sections', () => {
      const content = `{start_of_bridge}
Bridge content
{end_of_bridge}`;
      
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Bridge')).toHaveClass('chordpro-section-header');
      const bridgeSection = screen.getByText('Bridge content').closest('.chordpro-section');
      expect(bridgeSection).toHaveClass('chordpro-section-bridge');
    });

    it('handles unknown section types as content', () => {
      const content = `{start_of_intro}
Intro content
{end_of_intro}`;
      
      render(<ChordProViewer content={content} />);
      
      // Unknown sections should be treated as content type but might not show headers
      const introSection = screen.getByText('Intro content').closest('.chordpro-section');
      expect(introSection).toHaveClass('chordpro-section-content');
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed chord brackets', () => {
      const content = 'Some [unclosed chord\nAnother ]only closing bracket';
      render(<ChordProViewer content={content} />);
      
      // Should render without crashing
      expect(screen.getByText('Some [unclosed chord')).toBeInTheDocument();
      expect(screen.getByText('Another ]only closing bracket')).toBeInTheDocument();
    });

    it('handles malformed directive braces', () => {
      const content = 'Some {unclosed directive\nAnother }only closing brace';
      render(<ChordProViewer content={content} />);
      
      // Should render without crashing
      expect(screen.getByText('Some {unclosed directive')).toBeInTheDocument();
      expect(screen.getByText('Another }only closing brace')).toBeInTheDocument();
    });

    it('handles empty chord brackets', () => {
      const content = 'Empty []chord brackets';
      render(<ChordProViewer content={content} />);
      
      // Should handle empty chords gracefully
      expect(screen.getByText('Empty []chord brackets')).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'Very long line content '.repeat(100);
      render(<ChordProViewer content={longContent} />);
      
      expect(screen.getByText(longContent.trim())).toBeInTheDocument();
    });

    it('handles special characters', () => {
      const content = 'Special chars: é, ñ, 中文, 🎵, & < > "quotes"';
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('Special chars: é, ñ, 中文, 🎵, & < > "quotes"')).toBeInTheDocument();
    });

    it('handles mixed line types', () => {
      const content = `# Comment line
{title: Song Title}
Regular lyrics
[C]Lyrics with [G]chords
{start_of_chorus}
Chorus [Am]lyrics
{end_of_chorus}
More regular lyrics`;
      
      render(<ChordProViewer content={content} />);
      
      expect(screen.getByText('# Comment line')).toHaveClass('chordpro-comment');
      expect(screen.getByText('Song Title')).toHaveClass('chordpro-title');
      expect(screen.getByText('Regular lyrics')).toHaveClass('chordpro-lyrics');
      expect(screen.getByText('C')).toHaveClass('chordpro-chord');
      
      // Use more specific selector for the section header
      const sectionHeaders = screen.getAllByText('Chorus');
      const sectionHeader = sectionHeaders.find(el => el.classList.contains('chordpro-section-header'));
      expect(sectionHeader).toHaveClass('chordpro-section-header');
    });
  });

  describe('Content Structure', () => {
    it('maintains proper DOM structure', () => {
      const content = `{title: Test Song}
{start_of_verse}
[C]Test lyrics
{end_of_verse}`;
      
      render(<ChordProViewer content={content} />);
      
      const viewer = document.querySelector('.chordpro-viewer');
      expect(viewer).toBeInTheDocument();
      
      const metadata = viewer?.querySelector('.chordpro-metadata');
      expect(metadata).toBeInTheDocument();
      
      const contentDiv = viewer?.querySelector('.chordpro-content');
      expect(contentDiv).toBeInTheDocument();
      
      const section = contentDiv?.querySelector('.chordpro-section');
      expect(section).toBeInTheDocument();
    });

    it('orders elements correctly', () => {
      const content = `{title: Test Song}
First line
{start_of_chorus}
Second line
{end_of_chorus}`;
      
      render(<ChordProViewer content={content} />);
      
      // Check that metadata comes before content
      const viewer = document.querySelector('.chordpro-viewer');
      const allElements = viewer?.children;
      expect(allElements?.[0]).toHaveClass('chordpro-metadata');
      expect(allElements?.[1]).toHaveClass('chordpro-content');
    });
  });
});