/**
 * PerformanceMode Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceMode } from './PerformanceMode';

// Mock SynchronizedChordViewer and TranspositionControls
vi.mock('../SynchronizedChordViewer', () => ({
  SynchronizedChordViewer: ({ content, className }: any) => (
    <div data-testid="synchronized-chord-viewer" className={className}>
      {content}
    </div>
  ),
}));

vi.mock('../TranspositionControls', () => ({
  default: ({ onTranspose, onReset, currentTransposition, className }: any) => (
    <div data-testid="transposition-controls" className={className}>
      <button onClick={() => onTranspose(1)}>Transpose Up</button>
      <button onClick={() => onTranspose(-1)}>Transpose Down</button>
      <button onClick={onReset}>Reset</button>
      <span>Transposition: {currentTransposition}</span>
    </div>
  ),
}));

// Mock fullscreen API
const mockRequestFullscreen = vi.fn();
const mockExitFullscreen = vi.fn();

Object.defineProperty(document, 'fullscreenEnabled', {
  value: true,
  writable: true,
});

Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true,
});

Object.defineProperty(document, 'exitFullscreen', {
  value: mockExitFullscreen,
  writable: true,
});

// Mock HTMLElement.requestFullscreen
beforeEach(() => {
  HTMLElement.prototype.requestFullscreen = mockRequestFullscreen;
  vi.clearAllMocks();
});

const sampleContent = `{title: Test Song}
{artist: Test Artist}
[C]Hello [G]world [Am]test [F]chord`;

describe('PerformanceMode', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    expect(screen.getByTestId('synchronized-chord-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('transposition-controls')).toBeInTheDocument();
  });

  it('displays content in SynchronizedChordViewer', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const viewer = screen.getByTestId('synchronized-chord-viewer');
    expect(viewer).toHaveTextContent('Test Song');
    expect(viewer).toHaveTextContent('Test Artist');
    expect(viewer).toHaveTextContent('[C]Hello [G]world [Am]test [F]chord');
  });

  it('shows controls by default', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const controls = screen.getByTitle(/Enter fullscreen/i);
    expect(controls).toBeInTheDocument();
  });

  it('handles close callback', async () => {
    const onClose = vi.fn();
    render(<PerformanceMode content={sampleContent} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /✕/i });
    await userEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('toggles fullscreen when fullscreen button is clicked', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const fullscreenButton = screen.getByTitle(/Enter fullscreen/i);
    await userEvent.click(fullscreenButton);
    
    expect(mockRequestFullscreen).toHaveBeenCalledOnce();
  });

  it('changes theme when theme buttons are clicked', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const stageBrightButton = screen.getByRole('button', { name: /stage bright/i });
    await userEvent.click(stageBrightButton);
    
    const container = screen.getByRole('button', { name: /stage bright/i }).closest('.performance-mode');
    expect(container).toHaveClass('performance-mode--stage-bright');
  });

  it('handles font size changes', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const increaseFontButton = screen.getByRole('button', { name: /A\+/i });
    await userEvent.click(increaseFontButton);
    
    const fontDisplay = screen.getByText('22px');
    expect(fontDisplay).toBeInTheDocument();
  });

  it('handles transposition changes', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const transposeUpButton = screen.getByRole('button', { name: /transpose up/i });
    await userEvent.click(transposeUpButton);
    
    expect(screen.getByText('Transposition: 1')).toBeInTheDocument();
  });

  it('resets transposition', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    // First transpose up
    const transposeUpButton = screen.getByRole('button', { name: /transpose up/i });
    await userEvent.click(transposeUpButton);
    
    // Then reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await userEvent.click(resetButton);
    
    expect(screen.getByText('Transposition: 0')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', async () => {
    const onClose = vi.fn();
    render(<PerformanceMode content={sampleContent} onClose={onClose} />);
    
    // Test Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    
    // Test F11 key for fullscreen
    fireEvent.keyDown(document, { key: 'F11' });
    expect(mockRequestFullscreen).toHaveBeenCalledOnce();
  });

  it('applies correct CSS classes for different themes', () => {
    const { rerender } = render(<PerformanceMode content={sampleContent} />);
    
    let container = screen.getByTestId('synchronized-chord-viewer').closest('.performance-mode');
    expect(container).toHaveClass('performance-mode--practice');
    
    // Simulate theme change via keyboard shortcut
    fireEvent.keyDown(document, { key: 'F2' });
    
    container = screen.getByTestId('synchronized-chord-viewer').closest('.performance-mode');
    expect(container).toHaveClass('performance-mode--stage-bright');
  });

  it('disables fullscreen button when not supported', () => {
    // Mock fullscreen as not supported
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: false,
      writable: true,
    });
    
    render(<PerformanceMode content={sampleContent} />);
    
    const fullscreenButton = screen.getByTitle(/Enter fullscreen/i);
    expect(fullscreenButton).toBeDisabled();
  });

  it('shows keyboard shortcuts help', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    expect(screen.getByText('F11: Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('F1-F4: Themes')).toBeInTheDocument();
    expect(screen.getByText('Ctrl +/-: Font Size')).toBeInTheDocument();
    expect(screen.getByText('H: Toggle Controls')).toBeInTheDocument();
    expect(screen.getByText('Esc: Exit')).toBeInTheDocument();
  });

  it('toggles controls visibility with H key', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    const controls = screen.getByTitle(/Enter fullscreen/i).closest('.performance-mode__controls');
    expect(controls).toHaveClass('visible');
    
    fireEvent.keyDown(document, { key: 'h' });
    
    expect(controls).toHaveClass('hidden');
  });

  it('handles font size keyboard shortcuts', () => {
    render(<PerformanceMode content={sampleContent} />);
    
    // Test Ctrl++ to increase font size
    fireEvent.keyDown(document, { key: '+', ctrlKey: true });
    expect(screen.getByText('22px')).toBeInTheDocument();
    
    // Test Ctrl+- to decrease font size
    fireEvent.keyDown(document, { key: '-', ctrlKey: true });
    expect(screen.getByText('20px')).toBeInTheDocument();
    
    // Test Ctrl+0 to reset font size
    fireEvent.keyDown(document, { key: '+', ctrlKey: true });
    fireEvent.keyDown(document, { key: '0', ctrlKey: true });
    expect(screen.getByText('20px')).toBeInTheDocument();
  });

  it('enforces font size limits', async () => {
    render(<PerformanceMode content={sampleContent} />);
    
    // Test maximum font size
    const increaseFontButton = screen.getByRole('button', { name: /A\+/i });
    
    // Click many times to try to exceed maximum
    for (let i = 0; i < 20; i++) {
      await userEvent.click(increaseFontButton);
    }
    
    expect(screen.getByText('48px')).toBeInTheDocument();
    expect(increaseFontButton).toBeDisabled();
    
    // Test minimum font size
    const decreaseFontButton = screen.getByRole('button', { name: /A-/i });
    
    // Click many times to try to go below minimum
    for (let i = 0; i < 30; i++) {
      await userEvent.click(decreaseFontButton);
    }
    
    expect(screen.getByText('12px')).toBeInTheDocument();
    expect(decreaseFontButton).toBeDisabled();
  });
});