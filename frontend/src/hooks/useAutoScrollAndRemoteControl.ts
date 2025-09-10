/**
 * Enhanced Auto-Scroll and Remote Control Hook
 * Integrates auto-scroll, remote control, and voice control services
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { autoScrollService, AutoScrollConfig } from '../services/autoScrollService';
import { remoteControlService, RemoteControlConfig, RemoteCommand } from '../services/remoteControlService';
import { voiceControlService, VoiceControlConfig } from '../services/voiceControlService';
import { ChordTimeMapping, AudioSource, SyncTimeline } from '../types/audio';

export interface UseAutoScrollAndRemoteControlOptions {
  enableAutoScroll?: boolean;
  enableRemoteControl?: boolean;
  enableVoiceControl?: boolean;
  autoScrollConfig?: Partial<AutoScrollConfig>;
  remoteControlConfig?: Partial<RemoteControlConfig>;
  voiceControlConfig?: Partial<VoiceControlConfig>;
}

export interface UseAutoScrollAndRemoteControlReturn {
  // Auto-scroll state and controls
  autoScrollConfig: AutoScrollConfig;
  updateAutoScrollConfig: (config: Partial<AutoScrollConfig>) => void;
  isAutoScrollActive: boolean;
  isEmergencyStopped: boolean;
  isManualOverrideActive: boolean;
  scrollToChord: (chord: ChordTimeMapping, element: HTMLElement, currentTime: number) => void;
  pauseAutoScroll: () => void;
  resumeAutoScroll: () => void;
  stopAutoScroll: () => void;
  emergencyStopAutoScroll: () => void;
  clearEmergencyStop: () => void;
  setScrollContainer: (container: HTMLElement) => void;

  // Remote control state and controls
  remoteControlConfig: RemoteControlConfig;
  updateRemoteControlConfig: (config: Partial<RemoteControlConfig>) => void;
  remoteControlState: unknown;
  startRemoteControl: () => Promise<void>;
  stopRemoteControl: () => Promise<void>;
  connectedDevices: unknown[];
  lastRemoteCommand?: RemoteCommand;

  // Voice control state and controls
  voiceControlConfig: VoiceControlConfig;
  updateVoiceControlConfig: (config: Partial<VoiceControlConfig>) => void;
  voiceControlState: unknown;
  isVoiceControlSupported: boolean;
  startVoiceControl: () => void;
  stopVoiceControl: () => void;
  lastVoiceResult?: unknown;

  // Integration utilities
  setAudioSource: (source: AudioSource) => void;
  setTimeline: (timeline: SyncTimeline) => void;
  handleChordChange: (chord: ChordTimeMapping, element: HTMLElement, currentTime: number) => void;
}

export function useAutoScrollAndRemoteControl(
  options: UseAutoScrollAndRemoteControlOptions = {}
): UseAutoScrollAndRemoteControlReturn {
  const {
    enableAutoScroll = true,
    enableRemoteControl = false,
    enableVoiceControl = false,
    autoScrollConfig: initialAutoScrollConfig = {},
    remoteControlConfig: initialRemoteControlConfig = {},
    voiceControlConfig: initialVoiceControlConfig = {},
  } = options;

  // State
  const [autoScrollConfig, setAutoScrollConfig] = useState<AutoScrollConfig>(
    autoScrollService.getConfig()
  );
  const [remoteControlConfig, setRemoteControlConfig] = useState<RemoteControlConfig>(
    remoteControlService.getConfig()
  );
  const [voiceControlConfig, setVoiceControlConfig] = useState<VoiceControlConfig>(
    voiceControlService.getConfig()
  );

  const [isAutoScrollActive, setIsAutoScrollActive] = useState(false);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [isManualOverrideActive, setIsManualOverrideActive] = useState(false);
  const [remoteControlState, setRemoteControlState] = useState(
    remoteControlService.getState()
  );
  const [voiceControlState, setVoiceControlState] = useState(
    voiceControlService.getState()
  );
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [lastRemoteCommand, setLastRemoteCommand] = useState<RemoteCommand>();
  const [lastVoiceResult, setLastVoiceResult] = useState<unknown>();

  // Refs
  const currentAudioSource = useRef<AudioSource | null>(null);
  const currentTimeline = useRef<SyncTimeline | null>(null);
  const scrollContainer = useRef<HTMLElement | null>(null);

  // Initialize services
  useEffect(() => {
    // Apply initial configurations
    if (enableAutoScroll) {
      autoScrollService.updateConfig({
        enabled: true,
        ...initialAutoScrollConfig,
      });
    }

    if (enableRemoteControl) {
      remoteControlService.updateConfig({
        enabled: true,
        ...initialRemoteControlConfig,
      });
    }

    if (enableVoiceControl) {
      voiceControlService.updateConfig({
        enabled: true,
        ...initialVoiceControlConfig,
      });
    }

    // Set up event listeners
    setupAutoScrollListeners();
    setupRemoteControlListeners();
    setupVoiceControlListeners();

    return () => {
      // Cleanup listeners
      autoScrollService.removeEventListener('configUpdate', handleAutoScrollConfigUpdate);
      autoScrollService.removeEventListener('scrollComplete', handleScrollComplete);
      autoScrollService.removeEventListener('emergencyStop', handleAutoScrollEmergencyStop);
      autoScrollService.removeEventListener('manualOverride', handleManualOverride);

      remoteControlService.removeEventListener('configUpdate', handleRemoteControlConfigUpdate);
      remoteControlService.removeEventListener('serverStarted', handleRemoteControlServerStarted);
      remoteControlService.removeEventListener('deviceConnected', handleDeviceConnected);
      remoteControlService.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
      remoteControlService.removeEventListener('commandExecuted', handleRemoteCommandExecuted);

      voiceControlService.removeEventListener('configUpdate', handleVoiceControlConfigUpdate);
      voiceControlService.removeEventListener('speechResult', handleVoiceResult);
      voiceControlService.removeEventListener('commandRecognized', handleVoiceCommandRecognized);
    };
  }, []);

  // Auto-scroll event handlers
  const handleAutoScrollConfigUpdate = useCallback((data: unknown) => {
    setAutoScrollConfig(data.config);
  }, []);

  const handleScrollComplete = useCallback((data: unknown) => {
    setIsAutoScrollActive(false);
  }, []);

  const handleAutoScrollEmergencyStop = useCallback(() => {
    setIsEmergencyStopped(true);
    setIsAutoScrollActive(false);
  }, []);

  const handleManualOverride = useCallback((data: unknown) => {
    setIsManualOverrideActive(data.active);
  }, []);

  const setupAutoScrollListeners = useCallback(() => {
    autoScrollService.addEventListener('configUpdate', handleAutoScrollConfigUpdate);
    autoScrollService.addEventListener('scrollComplete', handleScrollComplete);
    autoScrollService.addEventListener('emergencyStop', handleAutoScrollEmergencyStop);
    autoScrollService.addEventListener('manualOverride', handleManualOverride);
  }, [handleAutoScrollConfigUpdate, handleScrollComplete, handleAutoScrollEmergencyStop, handleManualOverride]);

  // Remote control event handlers
  const handleRemoteControlConfigUpdate = useCallback((data: unknown) => {
    setRemoteControlConfig(data.config);
  }, []);

  const handleRemoteControlServerStarted = useCallback((data: unknown) => {
    setRemoteControlState(remoteControlService.getState());
  }, []);

  const handleDeviceConnected = useCallback((data: unknown) => {
    setConnectedDevices(remoteControlService.getState().connectedDevices);
  }, []);

  const handleDeviceDisconnected = useCallback((data: unknown) => {
    setConnectedDevices(remoteControlService.getState().connectedDevices);
  }, []);

  const handleRemoteCommandExecuted = useCallback((data: unknown) => {
    setLastRemoteCommand(data.command);
  }, []);

  const setupRemoteControlListeners = useCallback(() => {
    remoteControlService.addEventListener('configUpdate', handleRemoteControlConfigUpdate);
    remoteControlService.addEventListener('serverStarted', handleRemoteControlServerStarted);
    remoteControlService.addEventListener('deviceConnected', handleDeviceConnected);
    remoteControlService.addEventListener('deviceDisconnected', handleDeviceDisconnected);
    remoteControlService.addEventListener('commandExecuted', handleRemoteCommandExecuted);

    // Set up command handlers for integration with auto-scroll
    remoteControlService.addEventListener('command:autoScrollToggle', () => {
      const newConfig = { ...autoScrollConfig, enabled: !autoScrollConfig.enabled };
      updateAutoScrollConfig(newConfig);
    });

    remoteControlService.addEventListener('command:autoScrollSpeed', (data: unknown) => {
      const speed = data.speed || data.value || 1.0;
      updateAutoScrollConfig({ speed: Math.max(0.1, Math.min(5.0, speed)) });
    });

    remoteControlService.addEventListener('command:emergencyStop', () => {
      emergencyStopAutoScroll();
    });

    remoteControlService.addEventListener('command:scrollUp', () => {
      if (scrollContainer.current) {
        scrollContainer.current.scrollBy({ top: -100, behavior: 'smooth' });
      }
    });

    remoteControlService.addEventListener('command:scrollDown', () => {
      if (scrollContainer.current) {
        scrollContainer.current.scrollBy({ top: 100, behavior: 'smooth' });
      }
    });

    remoteControlService.addEventListener('command:scrollToTop', () => {
      if (scrollContainer.current) {
        scrollContainer.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    remoteControlService.addEventListener('command:scrollToBottom', () => {
      if (scrollContainer.current) {
        scrollContainer.current.scrollTo({ 
          top: scrollContainer.current.scrollHeight, 
          behavior: 'smooth' 
        });
      }
    });
  }, [autoScrollConfig]);

  // Voice control event handlers
  const handleVoiceControlConfigUpdate = useCallback((data: unknown) => {
    setVoiceControlConfig(data.config);
  }, []);

  const handleVoiceResult = useCallback((data: unknown) => {
    setLastVoiceResult(data.result);
    setVoiceControlState(voiceControlService.getState());
  }, []);

  const handleVoiceCommandRecognized = useCallback((data: unknown) => {
    // Convert voice command to remote command and execute
    const remoteCommand: RemoteCommand = {
      id: `voice_${Date.now()}`,
      type: data.command.action as unknown,
      payload: data.command.parameters,
      timestamp: Date.now(),
      deviceId: 'voice',
      deviceType: 'voice',
    };

    remoteControlService.executeCommand(remoteCommand);
  }, []);

  const setupVoiceControlListeners = useCallback(() => {
    voiceControlService.addEventListener('configUpdate', handleVoiceControlConfigUpdate);
    voiceControlService.addEventListener('speechResult', handleVoiceResult);
    voiceControlService.addEventListener('commandRecognized', handleVoiceCommandRecognized);
  }, [handleVoiceControlConfigUpdate, handleVoiceResult, handleVoiceCommandRecognized]);

  // Public API methods
  const updateAutoScrollConfig = useCallback((config: Partial<AutoScrollConfig>) => {
    autoScrollService.updateConfig(config);
  }, []);

  const updateRemoteControlConfig = useCallback((config: Partial<RemoteControlConfig>) => {
    remoteControlService.updateConfig(config);
  }, []);

  const updateVoiceControlConfig = useCallback((config: Partial<VoiceControlConfig>) => {
    voiceControlService.updateConfig(config);
  }, []);

  const scrollToChord = useCallback((
    chord: ChordTimeMapping, 
    element: HTMLElement, 
    currentTime: number
  ) => {
    setIsAutoScrollActive(true);
    autoScrollService.scrollToChord(chord, element, currentTime);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    autoScrollService.pause();
  }, []);

  const resumeAutoScroll = useCallback(() => {
    autoScrollService.resume();
  }, []);

  const stopAutoScroll = useCallback(() => {
    autoScrollService.stop();
  }, []);

  const emergencyStopAutoScroll = useCallback(() => {
    autoScrollService.emergencyStop();
  }, []);

  const clearEmergencyStop = useCallback(() => {
    autoScrollService.clearEmergencyStop();
    setIsEmergencyStopped(false);
  }, []);

  const setScrollContainer = useCallback((container: HTMLElement) => {
    scrollContainer.current = container;
    autoScrollService.setScrollContainer(container);
  }, []);

  const startRemoteControl = useCallback(async () => {
    await remoteControlService.start();
  }, []);

  const stopRemoteControl = useCallback(async () => {
    await remoteControlService.stop();
  }, []);

  const startVoiceControl = useCallback(() => {
    voiceControlService.startListening();
  }, []);

  const stopVoiceControl = useCallback(() => {
    voiceControlService.stopListening();
  }, []);

  const setAudioSource = useCallback((source: AudioSource) => {
    currentAudioSource.current = source;
  }, []);

  const setTimeline = useCallback((timeline: SyncTimeline) => {
    currentTimeline.current = timeline;
    
    // Update smart context for auto-scroll
    const smartContext = {
      currentSection: undefined,
      nextSection: undefined,
      sectionBoundaries: timeline.markers.map(marker => ({
        time: marker.time,
        section: marker.label,
      })),
      tempo: timeline.metadata.bpm || 120,
      timeSignature: timeline.metadata.timeSignature || '4/4',
    };
    
    autoScrollService.setSmartContext(smartContext);
  }, []);

  const handleChordChange = useCallback((
    chord: ChordTimeMapping, 
    element: HTMLElement, 
    currentTime: number
  ) => {
    if (autoScrollConfig.enabled && !isEmergencyStopped) {
      scrollToChord(chord, element, currentTime);
    }
  }, [autoScrollConfig.enabled, isEmergencyStopped, scrollToChord]);

  return {
    // Auto-scroll
    autoScrollConfig,
    updateAutoScrollConfig,
    isAutoScrollActive,
    isEmergencyStopped,
    isManualOverrideActive,
    scrollToChord,
    pauseAutoScroll,
    resumeAutoScroll,
    stopAutoScroll,
    emergencyStopAutoScroll,
    clearEmergencyStop,
    setScrollContainer,

    // Remote control
    remoteControlConfig,
    updateRemoteControlConfig,
    remoteControlState,
    startRemoteControl,
    stopRemoteControl,
    connectedDevices,
    lastRemoteCommand,

    // Voice control
    voiceControlConfig,
    updateVoiceControlConfig,
    voiceControlState,
    isVoiceControlSupported: voiceControlService.isSupported(),
    startVoiceControl,
    stopVoiceControl,
    lastVoiceResult,

    // Integration
    setAudioSource,
    setTimeline,
    handleChordChange,
  };
}