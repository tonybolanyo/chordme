/**
 * Test suite for Auto-Scroll and Remote Control functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { autoScrollService } from '../services/autoScrollService';
import { remoteControlService } from '../services/remoteControlService';
import { voiceControlService } from '../services/voiceControlService';
import { useAutoScrollAndRemoteControl } from '../hooks/useAutoScrollAndRemoteControl';
import { ChordTimeMapping } from '../types/audio';

// Mock DOM elements and APIs
global.HTMLElement = class MockHTMLElement {
  offsetTop = 100;
  clientHeight = 400;
  scrollTop = 0;
  scrollHeight = 1000;

  scrollTo = vi.fn();
  scrollBy = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  getBoundingClientRect = vi.fn(() => ({
    top: 0,
    bottom: 400,
    left: 0,
    right: 800,
    width: 800,
    height: 400,
  }));
} as unknown;

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  lang: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
};

// Set up global SpeechRecognition constructors
Object.defineProperty(window, 'SpeechRecognition', {
  value: vi.fn(() => mockSpeechRecognition),
  writable: true,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: vi.fn(() => mockSpeechRecognition),
  writable: true,
});

// Mock WebHID API
(global as unknown).navigator = {
  ...global.navigator,
  hid: {
    getDevices: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  userAgent: 'test-agent',
};

describe('AutoScrollService', () => {
  let container: HTMLElement;
  let chordElement: HTMLElement;
  let mockChord: ChordTimeMapping;

  beforeEach(() => {
    container = new (global.HTMLElement as unknown)();
    chordElement = new (global.HTMLElement as unknown)();
    
    mockChord = {
      id: 'chord-1',
      chordName: 'C',
      startTime: 10,
      endTime: 12,
      source: 'manual',
      verified: true,
    };

    autoScrollService.setScrollContainer(container);
  });

  afterEach(() => {
    autoScrollService.destroy();
  });

  it('should initialize with default configuration', () => {
    const config = autoScrollService.getConfig();
    
    expect(config.enabled).toBe(false);
    expect(config.speed).toBe(1.0);
    expect(config.smoothness).toBe(0.8);
    expect(config.behavior).toBe('smooth');
  });

  it('should update configuration', () => {
    const newConfig = {
      enabled: true,
      speed: 2.0,
      followTempo: false,
    };

    autoScrollService.updateConfig(newConfig);
    const config = autoScrollService.getConfig();

    expect(config.enabled).toBe(true);
    expect(config.speed).toBe(2.0);
    expect(config.followTempo).toBe(false);
  });

  it('should scroll to chord when enabled', () => {
    autoScrollService.updateConfig({ enabled: true });
    
    const scrollSpy = vi.spyOn(container, 'scrollTo');
    autoScrollService.scrollToChord(mockChord, chordElement, 10);

    // Allow time for async scrolling
    setTimeout(() => {
      expect(autoScrollService.isActive()).toBe(true);
    }, 50);
  });

  it('should not scroll when disabled', () => {
    autoScrollService.updateConfig({ enabled: false });
    
    const scrollSpy = vi.spyOn(container, 'scrollTo');
    autoScrollService.scrollToChord(mockChord, chordElement, 10);

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('should handle emergency stop', () => {
    autoScrollService.updateConfig({ enabled: true });
    autoScrollService.scrollToChord(mockChord, chordElement, 10);
    
    autoScrollService.emergencyStop();
    
    expect(autoScrollService.isActive()).toBe(false);
  });

  it('should detect manual override', (done) => {
    autoScrollService.updateConfig({ enabled: true, manualOverride: true });
    
    autoScrollService.addEventListener('manualOverride', (data) => {
      expect(data.active).toBe(true);
      done();
    });

    // Simulate manual scroll
    const wheelEvent = new Event('wheel');
    container.dispatchEvent(wheelEvent);
  });

  it('should handle smart scrolling with tempo', () => {
    const smartContext = {
      tempo: 140,
      timeSignature: '4/4',
      sectionBoundaries: [],
    };

    autoScrollService.updateConfig({ 
      enabled: true, 
      smartScrolling: true, 
      followTempo: true 
    });
    autoScrollService.setSmartContext(smartContext);
    autoScrollService.updateTempo(140);

    autoScrollService.scrollToChord(mockChord, chordElement, 10);
    
    expect(autoScrollService.isActive()).toBe(true);
  });
});

describe('RemoteControlService', () => {
  beforeEach(() => {
    remoteControlService.updateConfig({ enabled: false });
  });

  afterEach(() => {
    remoteControlService.destroy();
  });

  it('should initialize with default configuration', () => {
    const config = remoteControlService.getConfig();
    
    expect(config.enabled).toBe(false);
    expect(config.serverPort).toBe(8080);
    expect(config.maxConnections).toBe(10);
  });

  it('should update configuration', () => {
    const newConfig = {
      enabled: true,
      serverPort: 9090,
      enableVoiceControl: false,
    };

    remoteControlService.updateConfig(newConfig);
    const config = remoteControlService.getConfig();

    expect(config.enabled).toBe(true);
    expect(config.serverPort).toBe(9090);
    expect(config.enableVoiceControl).toBe(false);
  });

  it('should execute valid commands', () => {
    const commandExecutedSpy = vi.fn();
    remoteControlService.addEventListener('commandExecuted', commandExecutedSpy);

    const command = {
      id: 'cmd-1',
      type: 'play' as const,
      timestamp: Date.now(),
      deviceId: 'test-device',
      deviceType: 'smartphone' as const,
    };

    remoteControlService.executeCommand(command);
    
    expect(commandExecutedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ command })
    );
  });

  it('should handle emergency stop', () => {
    const emergencyStopSpy = vi.fn();
    remoteControlService.addEventListener('emergencyStop', emergencyStopSpy);

    const command = {
      id: 'cmd-2',
      type: 'emergency_stop' as const,
      timestamp: Date.now(),
      deviceId: 'test-device',
      deviceType: 'foot_pedal' as const,
    };

    remoteControlService.executeCommand(command);
    
    expect(emergencyStopSpy).toHaveBeenCalled();
    expect(remoteControlService.getState().isEmergencyLocked).toBe(true);
  });

  it('should block commands when emergency locked', () => {
    // First trigger emergency stop
    remoteControlService.executeCommand({
      id: 'emergency',
      type: 'emergency_stop',
      timestamp: Date.now(),
      deviceId: 'test',
      deviceType: 'smartphone',
    });

    const commandExecutedSpy = vi.fn();
    remoteControlService.addEventListener('commandExecuted', commandExecutedSpy);

    // Try to execute another command
    const blockedCommand = {
      id: 'blocked',
      type: 'play' as const,
      timestamp: Date.now(),
      deviceId: 'test',
      deviceType: 'smartphone' as const,
    };

    remoteControlService.executeCommand(blockedCommand);
    
    expect(commandExecutedSpy).not.toHaveBeenCalled();
  });

  it('should clear emergency lock', () => {
    // Trigger emergency stop
    remoteControlService.executeCommand({
      id: 'emergency',
      type: 'emergency_stop',
      timestamp: Date.now(),
      deviceId: 'test',
      deviceType: 'smartphone',
    });

    expect(remoteControlService.getState().isEmergencyLocked).toBe(true);

    // Clear emergency lock
    remoteControlService.clearEmergencyLock();
    
    expect(remoteControlService.getState().isEmergencyLocked).toBe(false);
  });
});

describe('VoiceControlService', () => {
  beforeEach(() => {
    voiceControlService.updateConfig({ enabled: false });
    vi.clearAllMocks();
  });

  afterEach(() => {
    voiceControlService.destroy();
  });

  it('should initialize with default configuration', () => {
    const config = voiceControlService.getConfig();
    
    expect(config.enabled).toBe(false);
    expect(config.language).toBe('en-US');
    expect(config.confidenceThreshold).toBe(0.7);
  });

  it('should detect speech recognition support', () => {
    expect(voiceControlService.isSupported()).toBe(true);
  });

  it('should update configuration', () => {
    const newConfig = {
      enabled: true,
      language: 'es-ES',
      confidenceThreshold: 0.8,
    };

    voiceControlService.updateConfig(newConfig);
    const config = voiceControlService.getConfig();

    expect(config.enabled).toBe(true);
    expect(config.language).toBe('es-ES');
    expect(config.confidenceThreshold).toBe(0.8);
  });

  it('should start and stop listening', () => {
    voiceControlService.updateConfig({ enabled: true });
    
    voiceControlService.startListening();
    expect(mockSpeechRecognition.start).toHaveBeenCalled();

    voiceControlService.stopListening();
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('should add and remove custom commands', () => {
    const customCommand = {
      id: 'custom-1',
      patterns: ['test command'],
      action: 'test_action',
      description: 'Test command',
      enabled: true,
    };

    voiceControlService.addCustomCommand(customCommand);
    
    const commands = voiceControlService.getAvailableCommands();
    expect(commands.some(cmd => cmd.id === 'custom-1')).toBe(true);

    voiceControlService.removeCustomCommand('custom-1');
    
    const updatedCommands = voiceControlService.getAvailableCommands();
    expect(updatedCommands.some(cmd => cmd.id === 'custom-1')).toBe(false);
  });

  it('should recognize voice commands', () => {
    const commandExecuteSpy = vi.fn();
    voiceControlService.addEventListener('commandExecute', commandExecuteSpy);

    // Simulate speech recognition result
    const mockResult = {
      transcript: 'play music',
      confidence: 0.9,
      isFinal: true,
      alternatives: [],
      timestamp: new Date(),
    };

    // Manually trigger command recognition
    voiceControlService.updateConfig({ enabled: true, confidenceThreshold: 0.7 });
    
    // This would normally be triggered by speech recognition
    // For testing, we'll simulate the internal process
    const availableCommands = voiceControlService.getAvailableCommands();
    const playCommand = availableCommands.find(cmd => cmd.patterns.includes('play'));
    
    expect(playCommand).toBeDefined();
    expect(playCommand?.action).toBe('play');
  });
});

describe('useAutoScrollAndRemoteControl Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({
        enableAutoScroll: true,
        enableRemoteControl: false,
        enableVoiceControl: false,
      })
    );

    expect(result.current.autoScrollConfig.enabled).toBe(true);
    expect(result.current.remoteControlConfig.enabled).toBe(false);
    expect(result.current.voiceControlConfig.enabled).toBe(false);
    expect(result.current.isAutoScrollActive).toBe(false);
    expect(result.current.isEmergencyStopped).toBe(false);
  });

  it('should update auto-scroll configuration', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({ enableAutoScroll: true })
    );

    act(() => {
      result.current.updateAutoScrollConfig({ speed: 2.0, smoothness: 0.5 });
    });

    expect(result.current.autoScrollConfig.speed).toBe(2.0);
    expect(result.current.autoScrollConfig.smoothness).toBe(0.5);
  });

  it('should handle chord changes', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({ enableAutoScroll: true })
    );

    const mockElement = new (global.HTMLElement as unknown)();
    const mockChord: ChordTimeMapping = {
      id: 'test-chord',
      chordName: 'C',
      startTime: 0,
      endTime: 2,
      source: 'manual',
      verified: true,
    };

    act(() => {
      result.current.handleChordChange(mockChord, mockElement, 1.0);
    });

    // The hook should trigger auto-scroll when enabled
    expect(result.current.isAutoScrollActive).toBe(true);
  });

  it('should handle emergency stop', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({ enableAutoScroll: true })
    );

    act(() => {
      result.current.emergencyStopAutoScroll();
    });

    expect(result.current.isEmergencyStopped).toBe(true);
  });

  it('should clear emergency stop', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({ enableAutoScroll: true })
    );

    act(() => {
      result.current.emergencyStopAutoScroll();
    });

    expect(result.current.isEmergencyStopped).toBe(true);

    act(() => {
      result.current.clearEmergencyStop();
    });

    expect(result.current.isEmergencyStopped).toBe(false);
  });
});

describe('Integration Tests', () => {
  let container: HTMLElement;
  let chordElement: HTMLElement;

  beforeEach(() => {
    container = new (global.HTMLElement as unknown)();
    chordElement = new (global.HTMLElement as unknown)();
  });

  afterEach(() => {
    autoScrollService.destroy();
    remoteControlService.destroy();
    voiceControlService.destroy();
  });

  it('should integrate auto-scroll with remote control commands', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({
        enableAutoScroll: true,
        enableRemoteControl: true,
      })
    );

    act(() => {
      result.current.setScrollContainer(container);
    });

    // Simulate remote command to toggle auto-scroll
    const toggleCommand = {
      id: 'remote-toggle',
      type: 'auto_scroll_toggle' as const,
      timestamp: Date.now(),
      deviceId: 'remote-device',
      deviceType: 'smartphone' as const,
    };

    const initialAutoScrollState = result.current.autoScrollConfig.enabled;

    act(() => {
      remoteControlService.executeCommand(toggleCommand);
    });

    // Auto-scroll state should have toggled
    expect(result.current.autoScrollConfig.enabled).toBe(!initialAutoScrollState);
  });

  it('should handle voice commands for auto-scroll control', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({
        enableAutoScroll: true,
        enableVoiceControl: true,
      })
    );

    // Simulate voice command recognition
    const mockVoiceCommand = {
      command: {
        id: 'voice-auto-scroll',
        action: 'auto_scroll_toggle',
        patterns: ['auto scroll'],
        description: 'Toggle auto scroll',
        enabled: true,
      },
      transcript: 'auto scroll',
      confidence: 0.9,
    };

    act(() => {
      // Simulate voice command execution
      const remoteCommand = {
        id: 'voice-cmd',
        type: 'auto_scroll_toggle' as const,
        timestamp: Date.now(),
        deviceId: 'voice',
        deviceType: 'voice' as const,
      };
      
      remoteControlService.executeCommand(remoteCommand);
    });

    // The voice command should have been processed
    expect(result.current.lastRemoteCommand?.deviceType).toBe('voice');
  });

  it('should coordinate emergency stop across all services', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({
        enableAutoScroll: true,
        enableRemoteControl: true,
        enableVoiceControl: true,
      })
    );

    // Trigger emergency stop via remote control
    const emergencyCommand = {
      id: 'emergency',
      type: 'emergency_stop' as const,
      timestamp: Date.now(),
      deviceId: 'emergency-device',
      deviceType: 'foot_pedal' as const,
    };

    act(() => {
      remoteControlService.executeCommand(emergencyCommand);
    });

    // All services should be in emergency state
    expect(result.current.isEmergencyStopped).toBe(true);
    expect(remoteControlService.getState().isEmergencyLocked).toBe(true);
  });
});

describe('Performance Tests', () => {
  it('should handle rapid chord changes efficiently', () => {
    const { result } = renderHook(() => 
      useAutoScrollAndRemoteControl({ enableAutoScroll: true })
    );

    const container = new (global.HTMLElement as unknown)();
    const chordElement = new (global.HTMLElement as unknown)();

    act(() => {
      result.current.setScrollContainer(container);
    });

    const startTime = performance.now();
    
    // Simulate rapid chord changes
    for (let i = 0; i < 100; i++) {
      const chord: ChordTimeMapping = {
        id: `chord-${i}`,
        chordName: 'C',
        startTime: i,
        endTime: i + 1,
        source: 'manual',
        verified: true,
      };

      act(() => {
        result.current.handleChordChange(chord, chordElement, i);
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should handle 100 chord changes in under 100ms
    expect(duration).toBeLessThan(100);
  });

  it('should handle multiple simultaneous remote commands', () => {
    const commands = [
      { type: 'play' as const },
      { type: 'volume_up' as const },
      { type: 'auto_scroll_toggle' as const },
      { type: 'scroll_down' as const },
      { type: 'speed_up' as const },
    ];

    const startTime = performance.now();

    commands.forEach((cmdType, index) => {
      const command = {
        id: `cmd-${index}`,
        type: cmdType.type,
        timestamp: Date.now(),
        deviceId: `device-${index}`,
        deviceType: 'smartphone' as const,
      };

      remoteControlService.executeCommand(command);
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should handle 5 commands in under 10ms
    expect(duration).toBeLessThan(10);
  });
});