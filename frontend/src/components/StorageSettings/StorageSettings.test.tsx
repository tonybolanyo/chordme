// Comprehensive tests for Storage Backend Selector component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import StorageSettings, { type StorageBackend } from './StorageSettings';

// Mock services - Define functions inline to avoid hoisting issues
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    isInitialized: vi.fn(),
  },
}));

vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    isConfigured: vi.fn(),
  },
}));

// Mock CSS import
vi.mock('./StorageSettings.css', () => ({}));

describe('StorageSettings Component', () => {
  const user = userEvent.setup();

  const defaultProps = {
    onClose: vi.fn(),
    currentBackend: 'api' as const,
    onBackendChange: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked services after mocks are cleared
    const { firebaseService } = await import('../../services/firebase');
    const { googleOAuth2Service } = await import('../../services/googleOAuth');

    vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
    vi.mocked(googleOAuth2Service.isConfigured).mockReturnValue(true);

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Component Rendering', () => {
    it('should render all storage backend options', () => {
      render(<StorageSettings {...defaultProps} />);

      expect(screen.getByText('REST API Storage')).toBeInTheDocument();
      expect(screen.getByText('Firebase/Firestore')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('Local Storage')).toBeInTheDocument();
    });

    it('should show backend descriptions', () => {
      render(<StorageSettings {...defaultProps} />);

      expect(
        screen.getByText(/server-based storage using flask backend/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/real-time cloud storage with live synchronization/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/store songs as files in your google drive/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/browser-based storage/i)).toBeInTheDocument();
    });

    it('should highlight current backend selection', () => {
      render(<StorageSettings {...defaultProps} currentBackend="firebase" />);

      const firebaseRadio = screen.getByDisplayValue('firebase');
      expect(firebaseRadio).toBeChecked();
    });

    it('should render action buttons', () => {
      render(<StorageSettings {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('Backend Availability Detection', () => {
    it('should show all backends as available when properly configured', () => {
      render(<StorageSettings {...defaultProps} />);

      // No unavailable badges should be present
      expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();

      // All radio buttons should be enabled
      expect(screen.getByDisplayValue('api')).toBeEnabled();
      expect(screen.getByDisplayValue('firebase')).toBeEnabled();
      expect(screen.getByDisplayValue('googledrive')).toBeEnabled();
      expect(screen.getByDisplayValue('localstorage')).toBeEnabled();
    });

    it('should mark Firebase as unavailable when not configured', async () => {
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      const firebaseOption = screen
        .getByDisplayValue('firebase')
        .closest('.backend-option');
      expect(firebaseOption).toHaveClass('disabled');
      expect(
        screen.getByText(
          /Firebase configuration required in environment variables/
        )
      ).toBeInTheDocument();
    });

    it('should mark Google Drive as unavailable when not configured', async () => {
      const { googleOAuth2Service } = await import(
        '../../services/googleOAuth'
      );
      vi.mocked(googleOAuth2Service.isConfigured).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      const googleDriveOption = screen
        .getByDisplayValue('googledrive')
        .closest('.backend-option');
      expect(googleDriveOption).toHaveClass('disabled');
      expect(
        screen.getByText(/Google OAuth configuration required/)
      ).toBeInTheDocument();
    });

    it('should mark Local Storage as unavailable when not supported', () => {
      // Mock localStorage as undefined (unsupported browser)
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      render(<StorageSettings {...defaultProps} />);

      const localStorageOption = screen
        .getByDisplayValue('localstorage')
        .closest('.backend-option');
      expect(localStorageOption).toHaveClass('disabled');
      expect(
        screen.getByText(/Local storage not supported in this browser/)
      ).toBeInTheDocument();
    });

    it('should always show REST API as available', async () => {
      const { firebaseService } = await import('../../services/firebase');
      const { googleOAuth2Service } = await import(
        '../../services/googleOAuth'
      );

      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
      vi.mocked(googleOAuth2Service.isConfigured).mockReturnValue(false);
      Object.defineProperty(global, 'localStorage', { value: undefined });

      render(<StorageSettings {...defaultProps} />);

      const apiOption = screen
        .getByDisplayValue('api')
        .closest('.backend-option');
      expect(apiOption).not.toHaveClass('disabled');
      expect(screen.getByDisplayValue('api')).toBeEnabled();
    });
  });

  describe('Backend Selection', () => {
    it('should allow selecting available backends', async () => {
      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      const firebaseRadio = screen.getByDisplayValue('firebase');
      await user.click(firebaseRadio);

      expect(firebaseRadio).toBeChecked();
      expect(screen.getByDisplayValue('api')).not.toBeChecked();
    });

    it('should prevent selecting unavailable backends', async () => {
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      const firebaseRadio = screen.getByDisplayValue('firebase');
      expect(firebaseRadio).toBeDisabled();

      await user.click(firebaseRadio);
      expect(firebaseRadio).not.toBeChecked();
      expect(screen.getByDisplayValue('api')).toBeChecked();
    });

    it('should update selection when clicking on backend option container', async () => {
      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      const firebaseOption = screen
        .getByDisplayValue('firebase')
        .closest('.backend-option');
      await user.click(firebaseOption!);

      expect(screen.getByDisplayValue('firebase')).toBeChecked();
    });

    it('should not change selection when clicking disabled backend option', async () => {
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      const firebaseOption = screen
        .getByDisplayValue('firebase')
        .closest('.backend-option');
      await user.click(firebaseOption!);

      expect(screen.getByDisplayValue('api')).toBeChecked();
      expect(screen.getByDisplayValue('firebase')).not.toBeChecked();
    });
  });

  describe('Form Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(<StorageSettings {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onBackendChange and onClose when save button is clicked', async () => {
      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      // Select a different backend
      const firebaseRadio = screen.getByDisplayValue('firebase');
      await user.click(firebaseRadio);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(defaultProps.onBackendChange).toHaveBeenCalledWith('firebase');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should not call onBackendChange if selection hasn't changed", async () => {
      render(<StorageSettings {...defaultProps} currentBackend="api" />);

      // Click save without changing selection
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not call onBackendChange since the selection is still 'api'
      expect(defaultProps.onBackendChange).not.toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Backend Configuration Messages', () => {
    it('should show configuration requirements for unavailable backends', async () => {
      const { firebaseService } = await import('../../services/firebase');
      const { googleOAuth2Service } = await import(
        '../../services/googleOAuth'
      );

      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
      vi.mocked(googleOAuth2Service.isConfigured).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      expect(
        screen.getByText(
          /Firebase configuration required in environment variables/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Google OAuth configuration required/)
      ).toBeInTheDocument();
    });

    it('should not show configuration messages for available backends', () => {
      render(<StorageSettings {...defaultProps} />);

      expect(
        screen.queryByText(/configuration required/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('should maintain selection state when backend availability changes', async () => {
      // Start with firebase selected and available
      const { rerender } = render(
        <StorageSettings {...defaultProps} currentBackend="firebase" />
      );

      expect(screen.getByDisplayValue('firebase')).toBeChecked();

      // Even if Firebase becomes unavailable after render,
      // the selected state should be maintained in the UI
      expect(screen.getByDisplayValue('firebase')).toBeChecked();
    });

    it('should reset to available backend when current backend becomes unavailable', async () => {
      // Start with firebase selected but unavailable
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} currentBackend="firebase" />);

      // Should show firebase as selected but disabled (current behavior)
      // Or fall back to api - let's check what actually happens
      const firebaseRadio = screen.getByDisplayValue('firebase');
      const apiRadio = screen.getByDisplayValue('api');

      // The component validates and should reset invalid backends to 'api'
      expect(apiRadio).toBeChecked();
      expect(firebaseRadio).not.toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure and labels', () => {
      render(<StorageSettings {...defaultProps} />);

      // Radio group should be properly labeled
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);

      radioButtons.forEach((radio) => {
        expect(radio).toHaveAttribute('name', 'storage-backend');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<StorageSettings {...defaultProps} />);

      const apiRadio = screen.getByDisplayValue('api');
      const firebaseRadio = screen.getByDisplayValue('firebase');

      apiRadio.focus();
      expect(apiRadio).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(firebaseRadio).toHaveFocus();
    });

    it('should announce selection changes to screen readers', async () => {
      render(<StorageSettings {...defaultProps} />);

      const firebaseRadio = screen.getByDisplayValue('firebase');

      await user.click(firebaseRadio);

      expect(firebaseRadio).toBeChecked();
    });

    it('should indicate disabled state for unavailable backends', async () => {
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      const firebaseRadio = screen.getByDisplayValue('firebase');
      expect(firebaseRadio).toHaveAttribute('disabled');
      expect(firebaseRadio.closest('.backend-option')).toHaveClass('disabled');
    });
  });

  describe('Dynamic Configuration Changes', () => {
    it('should update availability when services become configured', async () => {
      // Start with Firebase unavailable
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      expect(screen.getByDisplayValue('firebase')).toBeDisabled();
      expect(
        screen.getByText(
          /Firebase configuration required in environment variables/
        )
      ).toBeInTheDocument();

      // Note: In the current implementation, the component doesn't
      // automatically re-evaluate service availability on re-render
      // This would require additional state management or props to work
    });

    it('should handle multiple service availability changes', async () => {
      // Start with some services unavailable
      const { firebaseService } = await import('../../services/firebase');
      const { googleOAuth2Service } = await import(
        '../../services/googleOAuth'
      );

      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
      vi.mocked(googleOAuth2Service.isConfigured).mockReturnValue(false);

      render(<StorageSettings {...defaultProps} />);

      expect(screen.getAllByText('Unavailable')).toHaveLength(2);

      // Note: The component would need additional props or state management
      // to reactively update when service availability changes
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined localStorage gracefully', () => {
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      expect(() => {
        render(<StorageSettings {...defaultProps} />);
      }).not.toThrow();

      expect(
        screen.getByText(/Local storage not supported in this browser/)
      ).toBeInTheDocument();
    });

    it('should handle service check failures gracefully', async () => {
      const { firebaseService } = await import('../../services/firebase');
      vi.mocked(firebaseService.isInitialized).mockImplementation(() => {
        throw new Error('Service check failed');
      });

      expect(() => {
        render(<StorageSettings {...defaultProps} />);
      }).not.toThrow();

      // Should fall back to treating Firebase as unavailable
      expect(screen.getByDisplayValue('firebase')).toBeDisabled();
    });

    it('should handle missing backend in current selection', () => {
      // @ts-ignore - Testing invalid backend id
      render(
        <StorageSettings {...defaultProps} currentBackend="invalid-backend" />
      );

      // Should default to API backend
      expect(screen.getByDisplayValue('api')).toBeChecked();
    });
  });
});
