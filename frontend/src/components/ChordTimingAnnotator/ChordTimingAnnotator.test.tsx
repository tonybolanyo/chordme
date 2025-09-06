/**
 * ChordTimingAnnotator Component Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChordTimingAnnotator } from './ChordTimingAnnotator';
import { AudioSource, ChordTimeMapping, SyncTimeline } from '../../types/audio';

// Mock the useAudioSync hook
const mockUseAudioSync = {
  timeline: null as SyncTimeline | null,
  currentChord: null as ChordTimeMapping | null,
  isAnnotating: false,
  syncState: {
    isEnabled: true,
    isHighlighting: false,
    syncPosition: 0,
    lastSyncTime: Date.now(),
    driftCompensation: 0,
  },
  startAnnotation: vi.fn(),
  stopAnnotation: vi.fn(),
  addChordAnnotation: vi.fn(),
  updateChordAnnotation: vi.fn(),
  removeChordAnnotation: vi.fn(),
  addMarker: vi.fn(),
  createNewTimeline: vi.fn(),
  loadTimeline: vi.fn(),
};

vi.mock('../../hooks/useAudioSync', () => ({
  useAudioSync: () => mockUseAudioSync,
}));

describe('ChordTimingAnnotator', () => {
  const mockAudioSource: AudioSource = {
    id: 'test-audio',
    url: 'test-audio.mp3',
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 120,
    format: 'mp3',
    quality: 'high',
  };

  const mockTimeline: SyncTimeline = {
    id: 'test-timeline',
    audioSourceId: 'test-audio',
    chordMappings: [
      {
        id: 'chord-1',
        chordName: 'C',
        startTime: 0,
        endTime: 2,
        source: 'manual',
        verified: true,
      },
      {
        id: 'chord-2',
        chordName: 'Am',
        startTime: 2,
        endTime: 4,
        source: 'automatic',
        verified: false,
        confidence: 0.8,
      },
    ],
    tempoMappings: [],
    markers: [
      {
        id: 'marker-1',
        time: 1,
        label: 'Verse 1',
        type: 'verse',
      },
    ],
    loopSections: [],
    metadata: {
      title: 'Test Song',
      duration: 120,
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockUseAudioSync.timeline = null;
    mockUseAudioSync.currentChord = null;
    mockUseAudioSync.isAnnotating = false;
    mockUseAudioSync.syncState.syncPosition = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component', () => {
      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Chord Timing Annotation')).toBeInTheDocument();
      expect(screen.getByLabelText('Chord:')).toBeInTheDocument();
      expect(screen.getByText('Start (C)')).toBeInTheDocument();
      expect(screen.getByText('Stop (V)')).toBeInTheDocument();
    });

    it('should display audio source information', () => {
      render(<ChordTimingAnnotator audioSource={mockAudioSource} />);

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText(' - Test Artist')).toBeInTheDocument();
    });

    it('should show empty state when no annotations', () => {
      render(<ChordTimingAnnotator />);

      expect(screen.getByText('No chord annotations yet.')).toBeInTheDocument();
      expect(
        screen.getByText("Press 'C' to start annotating chords while the audio plays.")
      ).toBeInTheDocument();
    });
  });

  describe('Timeline Initialization', () => {
    it('should create new timeline when audio source is provided', () => {
      const mockNewTimeline = { ...mockTimeline };
      mockUseAudioSync.createNewTimeline.mockReturnValue(mockNewTimeline);

      render(<ChordTimingAnnotator audioSource={mockAudioSource} />);

      expect(mockUseAudioSync.createNewTimeline).toHaveBeenCalledWith(mockAudioSource);
      expect(mockUseAudioSync.loadTimeline).toHaveBeenCalledWith(mockNewTimeline);
    });

    it('should not create timeline if one already exists', () => {
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator audioSource={mockAudioSource} />);

      expect(mockUseAudioSync.createNewTimeline).not.toHaveBeenCalled();
    });
  });

  describe('Chord Input and Controls', () => {
    it('should update chord name input', async () => {
      const user = userEvent.setup();
      render(<ChordTimingAnnotator />);

      const chordInput = screen.getByLabelText('Chord:') as HTMLInputElement;
      await user.type(chordInput, 'G7');

      expect(chordInput.value).toBe('G7');
    });

    it('should start annotation when Start button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChordTimingAnnotator />);

      const startButton = screen.getByText('Start (C)');
      await user.click(startButton);

      expect(mockUseAudioSync.startAnnotation).toHaveBeenCalled();
    });

    it('should stop annotation when Stop button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAudioSync.isAnnotating = true;

      render(<ChordTimingAnnotator />);

      const stopButton = screen.getByText('Stop (V)');
      await user.click(stopButton);

      expect(mockUseAudioSync.stopAnnotation).toHaveBeenCalled();
    });

    it('should disable buttons when no sync state', () => {
      mockUseAudioSync.syncState = null as any;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Start (C)')).toBeDisabled();
      expect(screen.getByText('Add Marker (M)')).toBeDisabled();
    });

    it('should disable stop/cancel buttons when not annotating', () => {
      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Stop (V)')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Current Status Display', () => {
    it('should display current time', () => {
      mockUseAudioSync.syncState.syncPosition = 65.5;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Current Time: 1:05.50')).toBeInTheDocument();
    });

    it('should display current chord when playing', () => {
      mockUseAudioSync.currentChord = mockTimeline.chordMappings[0];

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Playing:')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should display annotation status when recording', () => {
      mockUseAudioSync.isAnnotating = true;
      mockUseAudioSync.syncState.syncPosition = 5;

      render(<ChordTimingAnnotator />);

      // Mock annotation draft (this would be set internally)
      // For testing purposes, we'll simulate the recording state
      expect(screen.getByText('Current Time: 0:05.00')).toBeInTheDocument();
    });
  });

  describe('Annotations List', () => {
    it('should display annotations count', () => {
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Chord Annotations (2)')).toBeInTheDocument();
    });

    it('should display annotation items', () => {
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator />);

      // Check chord names
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('Am')).toBeInTheDocument();

      // Check timing display
      expect(screen.getByText('0:00.00 - 0:02.00')).toBeInTheDocument();
      expect(screen.getByText('0:02.00 - 0:04.00')).toBeInTheDocument();

      // Check source badges
      expect(screen.getByText('manual')).toBeInTheDocument();
      expect(screen.getByText('automatic')).toBeInTheDocument();

      // Check confidence display
      expect(screen.getByText('(80%)')).toBeInTheDocument();
    });

    it('should highlight current chord annotation', () => {
      mockUseAudioSync.timeline = mockTimeline;
      mockUseAudioSync.currentChord = mockTimeline.chordMappings[0];

      render(<ChordTimingAnnotator />);

      const currentAnnotation = screen.getByText('C').closest('.annotation-item');
      expect(currentAnnotation).toHaveClass('current');
    });

    it('should handle annotation selection', async () => {
      const user = userEvent.setup();
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator />);

      const annotation = screen.getByText('C').closest('.annotation-item');
      await user.click(annotation!);

      expect(annotation).toHaveClass('selected');
    });

    it('should delete annotation when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator />);

      const deleteButtons = screen.getAllByTitle('Delete annotation');
      await user.click(deleteButtons[0]);

      expect(mockUseAudioSync.removeChordAnnotation).toHaveBeenCalledWith('chord-1');
    });
  });

  describe('Markers Display', () => {
    it('should display markers when available', () => {
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Markers (1)')).toBeInTheDocument();
      expect(screen.getByText('Verse 1')).toBeInTheDocument();
      expect(screen.getByText('verse')).toBeInTheDocument();
      expect(screen.getByText('0:01.00')).toBeInTheDocument();
    });

    it('should not display markers section when no markers', () => {
      mockUseAudioSync.timeline = {
        ...mockTimeline,
        markers: [],
      };

      render(<ChordTimingAnnotator />);

      expect(screen.queryByText('Markers')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should start annotation on C key press', async () => {
      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      fireEvent.keyDown(window, { key: 'c' });

      expect(mockUseAudioSync.startAnnotation).toHaveBeenCalled();
    });

    it('should stop annotation on V key press', async () => {
      mockUseAudioSync.isAnnotating = true;

      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      fireEvent.keyDown(window, { key: 'v' });

      expect(mockUseAudioSync.stopAnnotation).toHaveBeenCalled();
    });

    it('should open marker modal on M key press', async () => {
      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      fireEvent.keyDown(window, { key: 'm' });

      await waitFor(() => {
        expect(screen.getByText('Add Marker')).toBeInTheDocument();
      });
    });

    it('should cancel annotation on Escape key press', async () => {
      mockUseAudioSync.isAnnotating = true;

      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockUseAudioSync.stopAnnotation).toHaveBeenCalled();
    });

    it('should not handle keyboard shortcuts when disabled', async () => {
      render(<ChordTimingAnnotator enableKeyboardShortcuts={false} />);

      fireEvent.keyDown(window, { key: 'c' });

      expect(mockUseAudioSync.startAnnotation).not.toHaveBeenCalled();
    });

    it('should not handle keyboard shortcuts when typing in input', async () => {
      const user = userEvent.setup();
      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      const chordInput = screen.getByLabelText('Chord:');
      await user.click(chordInput);

      fireEvent.keyDown(chordInput, { key: 'c' });

      expect(mockUseAudioSync.startAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('Marker Modal', () => {
    beforeEach(async () => {
      render(<ChordTimingAnnotator />);
      
      const markerButton = screen.getByText('Add Marker (M)');
      fireEvent.click(markerButton);
      
      await waitFor(() => {
        expect(screen.getByText('Add Marker')).toBeInTheDocument();
      });
    });

    it('should display current time in marker modal', () => {
      mockUseAudioSync.syncState.syncPosition = 30.5;

      expect(screen.getByText('Time: 0:30.50')).toBeInTheDocument();
    });

    it('should add marker when form is submitted', async () => {
      const user = userEvent.setup();

      const markerInput = screen.getByPlaceholderText('Marker name');
      await user.type(markerInput, 'Bridge');

      const addButton = screen.getByText('Add Marker');
      await user.click(addButton);

      expect(mockUseAudioSync.addMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Bridge',
          type: 'custom',
          time: 0,
        })
      );
    });

    it('should add marker on Enter key press', async () => {
      const user = userEvent.setup();

      const markerInput = screen.getByPlaceholderText('Marker name');
      await user.type(markerInput, 'Chorus');
      
      fireEvent.keyDown(markerInput, { key: 'Enter' });

      expect(mockUseAudioSync.addMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Chorus',
        })
      );
    });

    it('should cancel marker modal on Cancel button', async () => {
      const user = userEvent.setup();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add Marker')).not.toBeInTheDocument();
      });
    });

    it('should cancel marker modal on Escape key', async () => {
      const markerInput = screen.getByPlaceholderText('Marker name');
      
      fireEvent.keyDown(markerInput, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Add Marker')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts Help', () => {
    it('should display keyboard shortcuts help', () => {
      render(<ChordTimingAnnotator enableKeyboardShortcuts={true} />);

      const helpToggle = screen.getByText('Keyboard Shortcuts');
      expect(helpToggle).toBeInTheDocument();

      // The details/summary element should be closed by default
      expect(screen.queryByText('C - Start chord annotation')).not.toBeVisible();
    });

    it('should hide keyboard shortcuts help when disabled', () => {
      render(<ChordTimingAnnotator enableKeyboardShortcuts={false} />);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  describe('Annotation Change Callback', () => {
    it('should call onAnnotationChange when timeline updates', () => {
      const onAnnotationChange = vi.fn();
      mockUseAudioSync.timeline = mockTimeline;

      render(<ChordTimingAnnotator onAnnotationChange={onAnnotationChange} />);

      expect(onAnnotationChange).toHaveBeenCalledWith(mockTimeline.chordMappings);
    });

    it('should not call onAnnotationChange when no timeline', () => {
      const onAnnotationChange = vi.fn();

      render(<ChordTimingAnnotator onAnnotationChange={onAnnotationChange} />);

      expect(onAnnotationChange).not.toHaveBeenCalled();
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      mockUseAudioSync.syncState.syncPosition = 125.75;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Current Time: 2:05.75')).toBeInTheDocument();
    });

    it('should handle zero time', () => {
      mockUseAudioSync.syncState.syncPosition = 0;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Current Time: 0:00.00')).toBeInTheDocument();
    });

    it('should handle fractional seconds', () => {
      mockUseAudioSync.syncState.syncPosition = 1.234;

      render(<ChordTimingAnnotator />);

      expect(screen.getByText('Current Time: 0:01.23')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ChordTimingAnnotator />);

      expect(screen.getByLabelText('Chord:')).toBeInTheDocument();
    });

    it('should have descriptive button titles', () => {
      render(<ChordTimingAnnotator />);

      expect(screen.getByTitle('Start annotation (C)')).toBeInTheDocument();
      expect(screen.getByTitle('Stop annotation (V)')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel annotation (Esc)')).toBeInTheDocument();
      expect(screen.getByTitle('Add marker (M)')).toBeInTheDocument();
    });

    it('should focus chord input when starting annotation', async () => {
      const user = userEvent.setup();
      render(<ChordTimingAnnotator />);

      const startButton = screen.getByText('Start (C)');
      await user.click(startButton);

      const chordInput = screen.getByLabelText('Chord:');
      expect(chordInput).toHaveFocus();
    });
  });
});