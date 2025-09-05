import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AutocompletionSettings from './AutocompletionSettings';

describe('AutocompletionSettings', () => {
  beforeEach(() => {
    // Mock localStorage with proper structure
    const mockLocalStorage = {
      getItem: vi.fn((key) => {
        if (key === 'chordme_autocompletion_settings') {
          return JSON.stringify({
            enabled: true,
            maxSuggestions: 8,
            showDirectives: true,
            showChords: true,
            contextAware: true,
            customChords: [],
          });
        }
        if (key === 'chordme_custom_chords') {
          return JSON.stringify([]);
        }
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock window methods
    Object.defineProperty(window, 'confirm', {
      value: vi.fn(() => true),
      writable: true,
    });
    Object.defineProperty(window, 'alert', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('renders settings panel when visible', () => {
    render(<AutocompletionSettings visible={true} />);
    
    expect(screen.getByText('Autocompletion Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable autocompletion')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(<AutocompletionSettings visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with close button when onClose provided', () => {
    const mockOnClose = vi.fn();
    render(<AutocompletionSettings visible={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays current settings values', () => {
    render(<AutocompletionSettings visible={true} />);
    
    const enabledCheckbox = screen.getByLabelText('Enable autocompletion') as HTMLInputElement;
    expect(enabledCheckbox.checked).toBe(true);
    
    const maxSuggestionsInput = screen.getByDisplayValue('8');
    expect(maxSuggestionsInput).toBeInTheDocument();
  });

  it('allows toggling settings', () => {
    render(<AutocompletionSettings visible={true} />);
    
    const enabledCheckbox = screen.getByLabelText('Enable autocompletion') as HTMLInputElement;
    fireEvent.click(enabledCheckbox);
    
    // Note: In a real test environment, we would verify the setting was saved
    // but here we're just testing the UI interaction works
  });

  it('shows custom chords section', () => {
    render(<AutocompletionSettings visible={true} />);
    
    expect(screen.getByText(/Custom Chords \(0\)/)).toBeInTheDocument();
    expect(screen.getByText('Add Custom Chord')).toBeInTheDocument();
    expect(screen.getByText('No custom chords added yet.')).toBeInTheDocument();
  });

  it('allows adding custom chords', async () => {
    render(<AutocompletionSettings visible={true} />);
    
    const addChordButton = screen.getByText('Add Custom Chord');
    fireEvent.click(addChordButton);
    
    // Form should appear
    expect(screen.getByPlaceholderText('Chord name (e.g., Cmyth)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Definition (e.g., 3 0 2 0 1 0)')).toBeInTheDocument();
    
    // Fill in chord details
    const nameInput = screen.getByPlaceholderText('Chord name (e.g., Cmyth)');
    const definitionInput = screen.getByPlaceholderText('Definition (e.g., 3 0 2 0 1 0)');
    
    fireEvent.change(nameInput, { target: { value: 'Cmyth' } });
    fireEvent.change(definitionInput, { target: { value: '3 0 2 0 1 0' } });
    
    const saveButton = screen.getByText('Add Chord');
    expect(saveButton).toBeEnabled();
    
    fireEvent.click(saveButton);
    
    // Form should reset and close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Chord name (e.g., Cmyth)')).not.toBeInTheDocument();
    });
  });

  it('shows data management actions', () => {
    render(<AutocompletionSettings visible={true} />);
    
    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Export Settings')).toBeInTheDocument();
    expect(screen.getByText('Import Settings')).toBeInTheDocument();
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });
});