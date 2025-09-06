// Enhanced presence system hook for multi-user awareness
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  UserPresence,
  PresenceNotification,
  PresencePrivacySettings,
  ActivityDetectionConfig,
  CollaborationUser,
} from '../types/collaboration';

interface UsePresenceSystemOptions {
  songId: string | null;
  userId: string | null;
  activityConfig?: Partial<ActivityDetectionConfig>;
  privacySettings?: Partial<PresencePrivacySettings>;
}

const DEFAULT_ACTIVITY_CONFIG: ActivityDetectionConfig = {
  typingIndicatorTimeout: 1000, // 1 second
  idleTimeout: 5 * 60 * 1000, // 5 minutes
  awayTimeout: 15 * 60 * 1000, // 15 minutes
  enableTypingIndicators: true,
  enableIdleDetection: true,
  enableActivityTracking: true,
};

const DEFAULT_PRIVACY_SETTINGS: PresencePrivacySettings = {
  showOnlineStatus: true,
  showActivityStatus: true,
  showCursorPosition: true,
  showCurrentLocation: true,
  allowDirectMessages: true,
  visibleToUsers: 'collaborators-only',
  invisibleMode: false,
};

export function usePresenceSystem({
  songId,
  userId,
  activityConfig = {},
  privacySettings = {},
}: UsePresenceSystemOptions) {
  const [presences, setPresences] = useState<UserPresence[]>([]);
  const [notifications, setNotifications] = useState<PresenceNotification[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [currentPrivacySettings, setCurrentPrivacySettings] = useState<PresencePrivacySettings>({
    ...DEFAULT_PRIVACY_SETTINGS,
    ...privacySettings,
  });
  
  const activityConfigRef = useRef({ ...DEFAULT_ACTIVITY_CONFIG, ...activityConfig });
  const privacySettingsRef = useRef(currentPrivacySettings);
  
  // Update ref when state changes
  useEffect(() => {
    privacySettingsRef.current = currentPrivacySettings;
  }, [currentPrivacySettings]);
  
  // Activity detection timers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Generate user avatar
  const generateUserAvatar = useCallback((user: CollaborationUser) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    
    const initials = user.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user.email.slice(0, 2).toUpperCase();
    
    const colorIndex = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const backgroundColor = colors[colorIndex % colors.length];
    
    return {
      initials,
      backgroundColor,
    };
  }, []);

  // Detect device type and capabilities
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }
    
    return {
      type: deviceType,
      isTouchDevice,
      userAgent: userAgent.slice(0, 100), // Truncate for privacy
    };
  }, []);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!userId || !songId || !activityConfigRef.current.enableTypingIndicators) return;
    
    setTypingUsers(prev => new Set(prev).add(userId));
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, activityConfigRef.current.typingIndicatorTimeout);
    
    lastActivityRef.current = Date.now();
  }, [userId, songId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!userId) return;
    
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    lastActivityRef.current = Date.now();
  }, [userId]);

  // Update user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Reset idle/away timers
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }
    
    // Set idle timeout
    if (activityConfigRef.current.enableIdleDetection) {
      idleTimeoutRef.current = setTimeout(() => {
        // Trigger idle status
        console.log('User went idle');
      }, activityConfigRef.current.idleTimeout);
      
      awayTimeoutRef.current = setTimeout(() => {
        // Trigger away status
        console.log('User went away');
      }, activityConfigRef.current.awayTimeout);
    }
  }, []);

  // Add presence notification
  const addNotification = useCallback((notification: Omit<PresenceNotification, 'id' | 'timestamp'>) => {
    const newNotification: PresenceNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      autoHide: notification.autoHide ?? true,
      hideAfter: notification.hideAfter ?? 5000,
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (newNotification.autoHide) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.hideAfter);
    }
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Update privacy settings
  const updatePrivacySettings = useCallback((settings: Partial<PresencePrivacySettings>) => {
    setCurrentPrivacySettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Get filtered presence based on privacy settings
  const getFilteredPresence = useCallback((presence: UserPresence): UserPresence | null => {
    const settings = privacySettingsRef.current;
    
    if (settings.invisibleMode && presence.userId !== userId) {
      return null;
    }
    
    return {
      ...presence,
      status: settings.showOnlineStatus ? presence.status : 'offline',
      activityDetails: settings.showActivityStatus ? presence.activityDetails : undefined,
    };
  }, [userId]);

  // Setup activity listeners
  useEffect(() => {
    if (!activityConfigRef.current.enableActivityTracking) return;
    
    const handleActivity = () => updateActivity();
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
    };
  }, [updateActivity]);

  // Handle presence updates
  useEffect(() => {
    if (!songId) return;

    const handlePresenceUpdate = (event: CustomEvent) => {
      const { songId: eventSongId, presences: newPresences } = event.detail;
      if (eventSongId === songId) {
        // Filter presences based on privacy settings
        const filteredPresences = newPresences
          .map(getFilteredPresence)
          .filter(Boolean);
        
        setPresences(filteredPresences);
      }
    };

    window.addEventListener('collaboration-presence-update', handlePresenceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('collaboration-presence-update', handlePresenceUpdate as EventListener);
    };
  }, [songId, getFilteredPresence]);

  return {
    // Presence data
    presences,
    typingUsers,
    notifications,
    
    // Activity functions
    startTyping,
    stopTyping,
    updateActivity,
    
    // User functions
    generateUserAvatar,
    getDeviceInfo,
    
    // Notification functions
    addNotification,
    removeNotification,
    
    // Privacy functions
    updatePrivacySettings,
    privacySettings: currentPrivacySettings,
    
    // Utility functions
    isUserTyping: (userId: string) => typingUsers.has(userId),
    getActiveUserCount: () => presences.filter(p => p.status === 'active').length,
    getTypingUserCount: () => typingUsers.size,
  };
}