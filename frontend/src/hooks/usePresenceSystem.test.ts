// Tests for enhanced presence system features
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresenceSystem } from './usePresenceSystem';
import type { 
  PresencePrivacySettings, 
  ActivityDetectionConfig,
  CollaborationUser 
} from '../types/collaboration';

// Mock user data
const mockUser: CollaborationUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  color: '#FF6B6B',
  lastSeen: new Date().toISOString(),
};

const mockSongId = 'song-123';

describe('usePresenceSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('User Avatar Generation', () => {
    it('should generate consistent user avatars', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      const avatar1 = result.current.generateUserAvatar(mockUser);
      const avatar2 = result.current.generateUserAvatar(mockUser);

      expect(avatar1).toEqual(avatar2);
      expect(avatar1.initials).toBe('TU');
      expect(avatar1.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle users without names', () => {
      const userWithoutName = {
        ...mockUser,
        name: undefined,
      };

      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      const avatar = result.current.generateUserAvatar(userWithoutName);

      expect(avatar.initials).toBe('TE');
    });
  });

  describe('Device Detection', () => {
    it('should detect device type and capabilities', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      const deviceInfo = result.current.getDeviceInfo();

      expect(deviceInfo).toHaveProperty('type');
      expect(deviceInfo).toHaveProperty('isTouchDevice');
      expect(deviceInfo).toHaveProperty('userAgent');
      expect(['desktop', 'mobile', 'tablet']).toContain(deviceInfo.type);
    });
  });

  describe('Typing Indicators', () => {
    it('should start and stop typing indicators', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isUserTyping(mockUser.id)).toBe(true);

      act(() => {
        result.current.stopTyping();
      });

      expect(result.current.isUserTyping(mockUser.id)).toBe(false);
    });

    it('should auto-stop typing after timeout', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
        activityConfig: { typingIndicatorTimeout: 1000 },
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isUserTyping(mockUser.id)).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isUserTyping(mockUser.id)).toBe(false);
    });
  });

  describe('Activity Detection', () => {
    it('should track user activity', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      expect(() => {
        act(() => {
          result.current.updateActivity();
        });
      }).not.toThrow();
    });

    it('should respect activity detection config', () => {
      const customConfig: Partial<ActivityDetectionConfig> = {
        enableTypingIndicators: false,
        enableIdleDetection: false,
        enableActivityTracking: false,
      };

      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
        activityConfig: customConfig,
      }));

      act(() => {
        result.current.startTyping();
      });

      // Should not start typing when disabled
      expect(result.current.isUserTyping(mockUser.id)).toBe(false);
    });
  });

  describe('Notifications', () => {
    it('should add and remove notifications', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      const notificationData = {
        type: 'user-joined' as const,
        userId: mockUser.id,
        userName: mockUser.name || mockUser.email,
      };

      act(() => {
        result.current.addNotification(notificationData);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject(notificationData);

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should auto-hide notifications', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      act(() => {
        result.current.addNotification({
          type: 'user-joined',
          userId: mockUser.id,
          userName: mockUser.name || mockUser.email,
          autoHide: true,
          hideAfter: 1000,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('Privacy Settings', () => {
    it('should update privacy settings', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      const newSettings: Partial<PresencePrivacySettings> = {
        showOnlineStatus: false,
        invisibleMode: true,
      };

      act(() => {
        result.current.updatePrivacySettings(newSettings);
      });

      expect(result.current.privacySettings.showOnlineStatus).toBe(false);
      expect(result.current.privacySettings.invisibleMode).toBe(true);
    });

    it('should use default privacy settings', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      expect(result.current.privacySettings).toMatchObject({
        showOnlineStatus: true,
        showActivityStatus: true,
        showCursorPosition: true,
        showCurrentLocation: true,
        allowDirectMessages: true,
        visibleToUsers: 'collaborators-only',
        invisibleMode: false,
      });
    });
  });

  describe('Utility (...args: unknown[]) => unknowns', () => {
    it('should count active users correctly', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      // Initially no active users
      expect(result.current.getActiveUserCount()).toBe(0);
    });

    it('should count typing users correctly', () => {
      const { result } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
      }));

      expect(result.current.getTypingUserCount()).toBe(0);

      act(() => {
        result.current.startTyping();
      });

      expect(result.current.getTypingUserCount()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle null songId gracefully', () => {
      expect(() => {
        renderHook(() => usePresenceSystem({
          songId: null,
          userId: mockUser.id,
        }));
      }).not.toThrow();
    });

    it('should handle null userId gracefully', () => {
      expect(() => {
        renderHook(() => usePresenceSystem({
          songId: mockSongId,
          userId: null,
        }));
      }).not.toThrow();
    });
  });

  describe('Event Listeners', () => {
    it('should setup activity listeners when enabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
        activityConfig: { enableActivityTracking: true },
      }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any((...args: unknown[]) => unknown), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any((...args: unknown[]) => unknown), true);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any((...args: unknown[]) => unknown), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any((...args: unknown[]) => unknown), true);
    });

    it('should not setup activity listeners when disabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => usePresenceSystem({
        songId: mockSongId,
        userId: mockUser.id,
        activityConfig: { enableActivityTracking: false },
      }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });
});