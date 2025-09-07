/**
 * Remote Control Service
 * Provides smartphone/tablet remote control capabilities via WebSocket
 * Supports wireless presenter remotes, foot pedals, and emergency controls
 */

export interface RemoteControlConfig {
  enabled: boolean;
  serverPort: number;
  allowedOrigins: string[];
  authToken?: string;
  connectionTimeout: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  maxConnections: number;
  enableQRCode: boolean;
  enableVoiceControl: boolean;
  enablePresenterRemote: boolean;
  enableFootPedal: boolean;
}

export interface RemoteCommand {
  id: string;
  type: RemoteCommandType;
  payload?: any;
  timestamp: number;
  deviceId: string;
  deviceType: DeviceType;
}

export type RemoteCommandType = 
  | 'play' | 'pause' | 'stop' | 'next' | 'previous'
  | 'volume_up' | 'volume_down' | 'mute'
  | 'speed_up' | 'speed_down' | 'speed_reset'
  | 'seek_forward' | 'seek_backward' | 'seek_to'
  | 'transpose_up' | 'transpose_down' | 'transpose_reset'
  | 'scroll_up' | 'scroll_down' | 'scroll_to_top' | 'scroll_to_bottom'
  | 'auto_scroll_toggle' | 'auto_scroll_speed'
  | 'emergency_stop' | 'manual_override'
  | 'fullscreen_toggle' | 'theme_toggle'
  | 'marker_add' | 'marker_jump'
  | 'loop_section_start' | 'loop_section_end' | 'loop_toggle'
  | 'voice_command';

export type DeviceType = 'smartphone' | 'tablet' | 'presenter_remote' | 'foot_pedal' | 'voice' | 'keyboard';

export interface ConnectedDevice {
  id: string;
  type: DeviceType;
  name: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  permissions: RemotePermission[];
}

export type RemotePermission = 
  | 'playback_control' | 'volume_control' | 'navigation'
  | 'transpose' | 'auto_scroll' | 'emergency_stop'
  | 'fullscreen' | 'markers' | 'loop_control';

export interface RemoteControlState {
  isServerRunning: boolean;
  connectedDevices: ConnectedDevice[];
  connectionUrl: string;
  qrCode?: string;
  lastCommand?: RemoteCommand;
  isEmergencyLocked: boolean;
}

export class RemoteControlService {
  private config: RemoteControlConfig = {
    enabled: false,
    serverPort: 8080,
    allowedOrigins: ['*'],
    connectionTimeout: 30000,
    heartbeatInterval: 5000,
    maxConnections: 10,
    enableQRCode: true,
    enableVoiceControl: true,
    enablePresenterRemote: true,
    enableFootPedal: true,
  };

  private state: RemoteControlState = {
    isServerRunning: false,
    connectedDevices: [],
    connectionUrl: '',
    isEmergencyLocked: false,
  };

  private websocketServer: WebSocket | null = null;
  private connectedClients = new Set<WebSocket>();
  private deviceRegistry = new Map<string, ConnectedDevice>();
  private commandHandlers = new Map<RemoteCommandType, Function>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventListeners = new Map<string, Set<Function>>();

  constructor() {
    this.setupCommandHandlers();
    this.setupDeviceInputHandlers();
  }

  // Configuration
  updateConfig(newConfig: Partial<RemoteControlConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    if (!wasEnabled && this.config.enabled) {
      this.start();
    } else if (wasEnabled && !this.config.enabled) {
      this.stop();
    }

    this.emit('configUpdate', { config: this.config });
  }

  getConfig(): RemoteControlConfig {
    return { ...this.config };
  }

  getState(): RemoteControlState {
    return { ...this.state };
  }

  // Server management
  async start(): Promise<void> {
    if (this.state.isServerRunning) {
      console.warn('Remote control server is already running');
      return;
    }

    try {
      await this.startWebSocketServer();
      this.setupHeartbeat();
      
      if (this.config.enableQRCode) {
        await this.generateQRCode();
      }

      this.state.isServerRunning = true;
      this.emit('serverStarted', { url: this.state.connectionUrl });
    } catch (error) {
      console.error('Failed to start remote control server:', error);
      this.emit('serverError', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isServerRunning) return;

    // Disconnect all clients
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });

    this.connectedClients.clear();
    this.deviceRegistry.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.state.isServerRunning = false;
    this.state.connectedDevices = [];
    this.emit('serverStopped', {});
  }

  private async startWebSocketServer(): Promise<void> {
    // Note: In a real implementation, this would set up a WebSocket server
    // For the browser environment, we'll simulate with a connection URL
    const host = window.location.hostname;
    const port = this.config.serverPort;
    this.state.connectionUrl = `ws://${host}:${port}/remote`;
    
    // Simulate WebSocket server for demonstration
    console.log(`Remote control server would start on ${this.state.connectionUrl}`);
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.checkClientTimeouts();
    }, this.config.heartbeatInterval);
  }

  private sendHeartbeat(): void {
    const heartbeatMessage = JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now(),
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(heartbeatMessage);
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.disconnectClient(client);
        }
      }
    });
  }

  private checkClientTimeouts(): void {
    const now = Date.now();
    
    this.deviceRegistry.forEach((device, deviceId) => {
      const timeSinceActivity = now - device.lastActivity.getTime();
      
      if (timeSinceActivity > this.config.connectionTimeout) {
        this.disconnectDevice(deviceId);
      }
    });
  }

  private async generateQRCode(): Promise<void> {
    // Generate QR code for easy mobile connection
    const qrData = JSON.stringify({
      url: this.state.connectionUrl,
      token: this.config.authToken,
      appName: 'ChordMe Remote',
    });

    // In a real implementation, this would generate an actual QR code
    this.state.qrCode = `data:image/svg+xml;base64,${btoa(this.createSimpleQR(qrData))}`;
  }

  private createSimpleQR(data: string): string {
    // Simplified QR code representation for demonstration
    return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">
        QR Code: ${data.substring(0, 20)}...
      </text>
    </svg>`;
  }

  // Device management
  private connectDevice(websocket: WebSocket, deviceInfo: Partial<ConnectedDevice>): string {
    const deviceId = this.generateDeviceId();
    const device: ConnectedDevice = {
      id: deviceId,
      type: deviceInfo.type || 'smartphone',
      name: deviceInfo.name || `${deviceInfo.type || 'Device'} ${deviceId.slice(-4)}`,
      userAgent: deviceInfo.userAgent,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      permissions: this.getDefaultPermissions(deviceInfo.type || 'smartphone'),
    };

    this.deviceRegistry.set(deviceId, device);
    this.connectedClients.add(websocket);
    this.updateConnectedDevices();

    this.emit('deviceConnected', { device });
    return deviceId;
  }

  private disconnectDevice(deviceId: string): void {
    const device = this.deviceRegistry.get(deviceId);
    if (device) {
      device.isActive = false;
      this.deviceRegistry.delete(deviceId);
      this.updateConnectedDevices();
      this.emit('deviceDisconnected', { device });
    }
  }

  private disconnectClient(websocket: WebSocket): void {
    this.connectedClients.delete(websocket);
    
    // Find and remove the associated device
    for (const [deviceId, device] of this.deviceRegistry.entries()) {
      if (!device.isActive) {
        this.disconnectDevice(deviceId);
        break;
      }
    }
  }

  private updateConnectedDevices(): void {
    this.state.connectedDevices = Array.from(this.deviceRegistry.values())
      .filter(device => device.isActive);
  }

  private getDefaultPermissions(deviceType: DeviceType): RemotePermission[] {
    const basePermissions: RemotePermission[] = ['playback_control', 'volume_control'];
    
    switch (deviceType) {
      case 'smartphone':
      case 'tablet':
        return [
          ...basePermissions,
          'navigation', 'transpose', 'auto_scroll', 'fullscreen', 'markers'
        ];
      
      case 'presenter_remote':
        return [
          ...basePermissions,
          'navigation', 'auto_scroll', 'fullscreen'
        ];
      
      case 'foot_pedal':
        return [
          'playback_control', 'navigation', 'auto_scroll', 'loop_control'
        ];
      
      case 'voice':
        return [
          ...basePermissions,
          'navigation', 'auto_scroll', 'emergency_stop'
        ];
      
      default:
        return basePermissions;
    }
  }

  // Command handling
  private setupCommandHandlers(): void {
    // Playback controls
    this.commandHandlers.set('play', () => this.emit('command:play', {}));
    this.commandHandlers.set('pause', () => this.emit('command:pause', {}));
    this.commandHandlers.set('stop', () => this.emit('command:stop', {}));
    this.commandHandlers.set('next', () => this.emit('command:next', {}));
    this.commandHandlers.set('previous', () => this.emit('command:previous', {}));

    // Volume controls
    this.commandHandlers.set('volume_up', () => this.emit('command:volumeUp', {}));
    this.commandHandlers.set('volume_down', () => this.emit('command:volumeDown', {}));
    this.commandHandlers.set('mute', () => this.emit('command:mute', {}));

    // Speed controls
    this.commandHandlers.set('speed_up', () => this.emit('command:speedUp', {}));
    this.commandHandlers.set('speed_down', () => this.emit('command:speedDown', {}));
    this.commandHandlers.set('speed_reset', () => this.emit('command:speedReset', {}));

    // Seek controls
    this.commandHandlers.set('seek_forward', () => this.emit('command:seekForward', {}));
    this.commandHandlers.set('seek_backward', () => this.emit('command:seekBackward', {}));
    this.commandHandlers.set('seek_to', (payload) => this.emit('command:seekTo', payload));

    // Transpose controls
    this.commandHandlers.set('transpose_up', () => this.emit('command:transposeUp', {}));
    this.commandHandlers.set('transpose_down', () => this.emit('command:transposeDown', {}));
    this.commandHandlers.set('transpose_reset', () => this.emit('command:transposeReset', {}));

    // Scroll controls
    this.commandHandlers.set('scroll_up', () => this.emit('command:scrollUp', {}));
    this.commandHandlers.set('scroll_down', () => this.emit('command:scrollDown', {}));
    this.commandHandlers.set('scroll_to_top', () => this.emit('command:scrollToTop', {}));
    this.commandHandlers.set('scroll_to_bottom', () => this.emit('command:scrollToBottom', {}));

    // Auto-scroll controls
    this.commandHandlers.set('auto_scroll_toggle', () => this.emit('command:autoScrollToggle', {}));
    this.commandHandlers.set('auto_scroll_speed', (payload) => this.emit('command:autoScrollSpeed', payload));

    // Emergency controls
    this.commandHandlers.set('emergency_stop', () => this.handleEmergencyStop());
    this.commandHandlers.set('manual_override', () => this.emit('command:manualOverride', {}));

    // UI controls
    this.commandHandlers.set('fullscreen_toggle', () => this.emit('command:fullscreenToggle', {}));
    this.commandHandlers.set('theme_toggle', () => this.emit('command:themeToggle', {}));

    // Marker and loop controls
    this.commandHandlers.set('marker_add', (payload) => this.emit('command:markerAdd', payload));
    this.commandHandlers.set('marker_jump', (payload) => this.emit('command:markerJump', payload));
    this.commandHandlers.set('loop_section_start', () => this.emit('command:loopSectionStart', {}));
    this.commandHandlers.set('loop_section_end', () => this.emit('command:loopSectionEnd', {}));
    this.commandHandlers.set('loop_toggle', () => this.emit('command:loopToggle', {}));

    // Voice command
    this.commandHandlers.set('voice_command', (payload) => this.handleVoiceCommand(payload));
  }

  executeCommand(command: RemoteCommand): void {
    if (this.state.isEmergencyLocked && command.type !== 'emergency_stop') {
      console.warn('Remote control is emergency locked. Only emergency stop commands allowed.');
      return;
    }

    // Update device activity
    const device = this.deviceRegistry.get(command.deviceId);
    if (device) {
      device.lastActivity = new Date();
      
      // Check permissions
      const requiredPermission = this.getRequiredPermission(command.type);
      if (requiredPermission && !device.permissions.includes(requiredPermission)) {
        console.warn(`Device ${device.name} lacks permission for ${command.type}`);
        return;
      }
    }

    // Execute command
    const handler = this.commandHandlers.get(command.type);
    if (handler) {
      try {
        handler(command.payload);
        this.state.lastCommand = command;
        this.emit('commandExecuted', { command });
      } catch (error) {
        console.error(`Error executing command ${command.type}:`, error);
        this.emit('commandError', { command, error });
      }
    } else {
      console.warn(`Unknown command type: ${command.type}`);
    }
  }

  private getRequiredPermission(commandType: RemoteCommandType): RemotePermission | null {
    const permissionMap: Record<string, RemotePermission> = {
      'play': 'playback_control',
      'pause': 'playback_control',
      'stop': 'playback_control',
      'next': 'navigation',
      'previous': 'navigation',
      'volume_up': 'volume_control',
      'volume_down': 'volume_control',
      'mute': 'volume_control',
      'transpose_up': 'transpose',
      'transpose_down': 'transpose',
      'auto_scroll_toggle': 'auto_scroll',
      'auto_scroll_speed': 'auto_scroll',
      'emergency_stop': 'emergency_stop',
      'fullscreen_toggle': 'fullscreen',
      'marker_add': 'markers',
      'marker_jump': 'markers',
      'loop_toggle': 'loop_control',
    };

    return permissionMap[commandType] || null;
  }

  private handleEmergencyStop(): void {
    this.state.isEmergencyLocked = true;
    this.emit('emergencyStop', {});
    
    // Notify all connected devices
    this.broadcastToDevices({
      type: 'emergency_stop',
      message: 'Emergency stop activated',
      timestamp: Date.now(),
    });
  }

  clearEmergencyLock(): void {
    this.state.isEmergencyLocked = false;
    this.emit('emergencyLockCleared', {});
  }

  private handleVoiceCommand(payload: { command: string; confidence: number }): void {
    if (!this.config.enableVoiceControl) return;

    // Process voice command and convert to appropriate remote command
    const voiceCommand = this.parseVoiceCommand(payload.command);
    if (voiceCommand) {
      this.emit('command:voice', { ...voiceCommand, confidence: payload.confidence });
    }
  }

  private parseVoiceCommand(command: string): any {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Basic voice command mapping
    if (normalizedCommand.includes('play')) return { type: 'play' };
    if (normalizedCommand.includes('pause') || normalizedCommand.includes('stop')) return { type: 'pause' };
    if (normalizedCommand.includes('next')) return { type: 'next' };
    if (normalizedCommand.includes('previous') || normalizedCommand.includes('back')) return { type: 'previous' };
    if (normalizedCommand.includes('louder') || normalizedCommand.includes('volume up')) return { type: 'volume_up' };
    if (normalizedCommand.includes('quieter') || normalizedCommand.includes('volume down')) return { type: 'volume_down' };
    if (normalizedCommand.includes('emergency') || normalizedCommand.includes('stop everything')) return { type: 'emergency_stop' };
    if (normalizedCommand.includes('scroll up')) return { type: 'scroll_up' };
    if (normalizedCommand.includes('scroll down')) return { type: 'scroll_down' };
    if (normalizedCommand.includes('auto scroll')) return { type: 'auto_scroll_toggle' };
    
    return null;
  }

  // Device input handlers (keyboard shortcuts, presenter remotes, foot pedals)
  private setupDeviceInputHandlers(): void {
    if (this.config.enablePresenterRemote || this.config.enableFootPedal) {
      this.setupHIDDeviceHandlers();
    }
    
    this.setupKeyboardShortcuts();
  }

  private setupHIDDeviceHandlers(): void {
    // Set up HID device detection and handling
    if ('hid' in navigator) {
      this.setupWebHID();
    } else {
      // Fallback to keyboard events for presenter remotes
      this.setupPresenterRemoteKeyboard();
    }
  }

  private async setupWebHID(): Promise<void> {
    try {
      // Request HID device access
      const devices = await (navigator as any).hid.getDevices();
      console.log('Available HID devices:', devices);

      // Listen for device connections
      (navigator as any).hid.addEventListener('connect', (event: any) => {
        this.handleHIDDeviceConnect(event.device);
      });

      (navigator as any).hid.addEventListener('disconnect', (event: any) => {
        this.handleHIDDeviceDisconnect(event.device);
      });
    } catch (error) {
      console.warn('WebHID not available or permission denied:', error);
    }
  }

  private handleHIDDeviceConnect(device: any): void {
    console.log('HID device connected:', device);
    
    const deviceInfo: Partial<ConnectedDevice> = {
      type: this.inferDeviceType(device),
      name: device.productName || 'Unknown HID Device',
      userAgent: navigator.userAgent,
    };

    // Register the device
    const deviceId = this.connectDevice(null as any, deviceInfo);
    
    // Set up input event handling
    device.addEventListener('inputreport', (event: any) => {
      this.handleHIDInput(deviceId, event);
    });

    try {
      device.open();
    } catch (error) {
      console.error('Failed to open HID device:', error);
    }
  }

  private handleHIDDeviceDisconnect(device: any): void {
    console.log('HID device disconnected:', device);
    // Find and disconnect the device
  }

  private inferDeviceType(device: any): DeviceType {
    const productName = (device.productName || '').toLowerCase();
    
    if (productName.includes('presenter') || productName.includes('remote')) {
      return 'presenter_remote';
    }
    if (productName.includes('foot') || productName.includes('pedal')) {
      return 'foot_pedal';
    }
    
    return 'presenter_remote'; // Default for HID devices
  }

  private handleHIDInput(deviceId: string, event: any): void {
    // Parse HID input and convert to remote commands
    const { data } = event;
    const command = this.parseHIDInput(deviceId, data);
    
    if (command) {
      this.executeCommand(command);
    }
  }

  private parseHIDInput(deviceId: string, data: DataView): RemoteCommand | null {
    // Basic HID input parsing for presenter remotes and foot pedals
    const byte0 = data.getUint8(0);
    
    let commandType: RemoteCommandType | null = null;
    
    // Common presenter remote mappings
    switch (byte0) {
      case 0x01: commandType = 'next'; break;
      case 0x02: commandType = 'previous'; break;
      case 0x04: commandType = 'play'; break;
      case 0x08: commandType = 'pause'; break;
      case 0x10: commandType = 'emergency_stop'; break;
      case 0x20: commandType = 'auto_scroll_toggle'; break;
    }

    if (commandType) {
      return {
        id: this.generateCommandId(),
        type: commandType,
        timestamp: Date.now(),
        deviceId,
        deviceType: 'presenter_remote',
      };
    }

    return null;
  }

  private setupPresenterRemoteKeyboard(): void {
    // Fallback keyboard mapping for presenter remotes
    document.addEventListener('keydown', (event) => {
      if (!this.config.enablePresenterRemote) return;
      
      let commandType: RemoteCommandType | null = null;
      
      switch (event.code) {
        case 'PageDown':
        case 'ArrowRight':
          commandType = 'next';
          break;
        case 'PageUp':
        case 'ArrowLeft':
          commandType = 'previous';
          break;
        case 'F5':
          commandType = 'play';
          break;
        case 'Escape':
          commandType = 'pause';
          break;
      }

      if (commandType && (event.target as HTMLElement).tagName !== 'INPUT') {
        event.preventDefault();
        
        const command: RemoteCommand = {
          id: this.generateCommandId(),
          type: commandType,
          timestamp: Date.now(),
          deviceId: 'keyboard',
          deviceType: 'keyboard',
        };

        this.executeCommand(command);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Emergency stop: Ctrl+Alt+Escape
      if (event.ctrlKey && event.altKey && event.code === 'Escape') {
        this.handleEmergencyStop();
        event.preventDefault();
        return;
      }

      // Other keyboard shortcuts can be added here
    });
  }

  // Helper methods
  private broadcastToDevices(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Failed to broadcast message:', error);
        }
      }
    });
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event handling
  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(type: string, data: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in remote control event listener for ${type}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const remoteControlService = new RemoteControlService();