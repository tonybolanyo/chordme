import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordProDemo from './ChordProDemo';

// Mock all the child components
vi.mock('../components', () => ({
  ChordProEditor: () => <div data-testid="chordpro-editor">Editor</div>,
  ChordProViewer: () => <div data-testid="chordpro-viewer">Viewer</div>,
  ChordPalette: () => <div data-testid="chord-palette">Palette</div>,
  TranspositionControls: () => (
    <div data-testid="transposition-controls">Controls</div>
  ),
  ViewModeSelector: () => <div data-testid="view-mode-selector">View Mode</div>,
  SplitViewLayout: ({ editorContent, previewContent }: unknown) => (
    <div data-testid="split-view-layout">
      <div data-testid="editor-content">{editorContent}</div>
      <div data-testid="preview-content">{previewContent}</div>
    </div>
  ),
}));

// Mock the chord service
vi.mock('../services/chordService', () => ({
  transposeChordProContent: vi.fn((content) => content),
  transposeChordProContentWithKey: vi.fn((content) => content),
  detectKeySignature: vi.fn(() => ({ detectedKey: 'G' })),
}));

// Mock the hooks
vi.mock('../hooks/useSplitView', () => ({
  useSplitView: vi.fn(() => ({
    config: {
      viewMode: 'split',
      splitOrientation: 'vertical',
      splitRatio: 0.5,
      enableSyncedScrolling: true,
    },
    setViewMode: vi.fn(),
    setSplitOrientation: vi.fn(),
    setSplitRatio: vi.fn(),
  })),
}));

vi.mock('../hooks/useSyncedScrolling', () => ({
  useSyncedScrolling: vi.fn(() => ({
    editorRef: { current: null },
    previewRef: { current: null },
  })),
}));

describe('ChordProDemo Component', () => {
  it('renders main title', () => {
    render(<ChordProDemo />);
    expect(
      screen.getByText('ChordPro Syntax Highlighting Demo')
    ).toBeInTheDocument();
  });

  it('renders all main components', () => {
    render(<ChordProDemo />);
    expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
    expect(screen.getByTestId('chordpro-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('chord-palette')).toBeInTheDocument();
    expect(screen.getAllByTestId('transposition-controls')).toHaveLength(2); // One in editor section, one standalone
  });

  it('renders section headers', () => {
    render(<ChordProDemo />);
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Raw Content' })).toBeInTheDocument();
  });

  it('describes ChordPro features', () => {
    render(<ChordProDemo />);
    expect(
      screen.getByText(
        /This demonstrates the ChordPro syntax highlighting features/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Interactive Features/)).toBeInTheDocument();
  });

  it('has proper heading hierarchy', () => {
    render(<ChordProDemo />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // Updated to match actual structure
  });
});
