---
layout: default
lang: en
title: Auto-Scroll and Remote Control System
---

# Auto-Scroll and Remote Control System

## Overview

ChordMe's enhanced auto-scroll and remote control system provides intelligent, hands-free operation capabilities for live performances and practice sessions. The system includes configurable auto-scrolling, smartphone/tablet remote control, wireless presenter remote support, foot pedal integration, voice control, and comprehensive emergency stop mechanisms.

## Features

### 🎯 Enhanced Auto-Scroll Engine

The auto-scroll system provides intelligent scrolling that adapts to your performance style:

- **Configurable Speed**: Adjust scroll speed from 0.1x to 5.0x
- **Smart Scrolling**: Follows song structure and tempo changes
- **Anticipatory Scrolling**: Scrolls ahead based on BPM and time signature  
- **Multiple Behaviors**: Smooth, instant, or progressive scrolling modes
- **Manual Override**: Automatic detection when user manually scrolls
- **Emergency Stop**: Instant halt with Ctrl+Alt+Escape
- **Tempo Synchronization**: Real-time BPM tracking and adjustment

### 🎮 Remote Control System

Control ChordMe from external devices:

- **WebSocket Server**: Reliable connection for mobile devices
- **QR Code Pairing**: Easy device connection setup
- **Multi-Device Support**: Up to 50 concurrent connections
- **Device Permissions**: Granular control over device capabilities
- **Presenter Remote**: USB/Bluetooth HID device support
- **Foot Pedal**: Hands-free control for performers
- **Connection Management**: Automatic timeout and reconnection

### 🎤 Voice Control

Natural language commands in multiple languages:

- **Multi-Language**: English, Spanish, French, German, Portuguese
- **Wake Word Detection**: Optional "Hey ChordMe" activation
- **Custom Commands**: Add your own voice patterns
- **Confidence Filtering**: Adjustable recognition threshold
- **Noise Filtering**: Background noise suppression
- **Continuous Listening**: Always-on voice recognition

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Import the services
import { 
  autoScrollService,
  remoteControlService, 
  voiceControlService 
} from './services';

# Use the integration hook
import { useAutoScrollAndRemoteControl } from './hooks/useAutoScrollAndRemoteControl';
```

### Basic Usage

```tsx
import React from 'react';
import { useAutoScrollAndRemoteControl } from './hooks/useAutoScrollAndRemoteControl';
import { AutoScrollRemoteControlPanel } from './components/AutoScrollRemoteControlPanel';

function MyMusicApp() {
  const {
    autoScrollConfig,
    updateAutoScrollConfig,
    isAutoScrollActive,
    handleChordChange,
    startRemoteControl,
    startVoiceControl,
  } = useAutoScrollAndRemoteControl({
    enableAutoScroll: true,
    enableRemoteControl: true,
    enableVoiceControl: true,
  });

  return (
    <div>
      {/* Control panel for configuration */}
      <AutoScrollRemoteControlPanel />
      
      {/* Your chord viewer component */}
      <SynchronizedChordViewer 
        content={chordProContent}
        enableAutoScroll={true}
        enableRemoteControl={true}
        enableVoiceControl={true}
        onChordChange={handleChordChange}
      />
    </div>
  );
}
```

## Configuration

### Auto-Scroll Configuration

```typescript
interface AutoScrollConfig {
  enabled: boolean;
  speed: number;              // 0.1 - 5.0 speed multiplier
  smoothness: number;         // 0.1 - 1.0 smoothness factor
  followTempo: boolean;       // Sync with audio BPM
  smartScrolling: boolean;    // Use song structure awareness
  anticipation: number;       // Seconds to scroll ahead (0-5)
  behavior: 'smooth' | 'instant' | 'progressive';
  centerThreshold: number;    // Viewport percentage for centering
  emergencyStop: boolean;     // Enable emergency stop
  manualOverride: boolean;    // Allow manual override detection
}

// Update configuration
updateAutoScrollConfig({
  speed: 1.5,
  smoothness: 0.8,
  followTempo: true,
  smartScrolling: true,
  anticipation: 2.0,
});
```

### Remote Control Configuration

```typescript
interface RemoteControlConfig {
  enabled: boolean;
  serverPort: number;         // WebSocket server port
  maxConnections: number;     // Maximum concurrent devices
  enableQRCode: boolean;      // Generate QR codes for pairing
  enablePresenterRemote: boolean; // USB/Bluetooth presenter support
  enableFootPedal: boolean;   // Foot pedal integration
  connectionTimeout: number;  // Device timeout in milliseconds
  heartbeatInterval: number;  // Keep-alive interval
}

// Start remote control server
await startRemoteControl();

// Update configuration
updateRemoteControlConfig({
  maxConnections: 10,
  enablePresenterRemote: true,
  enableFootPedal: true,
});
```

### Voice Control Configuration

```typescript
interface VoiceControlConfig {
  enabled: boolean;
  language: string;           // 'en-US', 'es-ES', 'fr-FR', etc.
  continuous: boolean;        // Continuous listening mode
  confidenceThreshold: number; // 0.5 - 1.0 recognition confidence
  wakeWord?: string;          // Optional wake word
  noiseFilter: boolean;       // Background noise filtering
  customCommands: VoiceCommand[]; // Custom voice patterns
}

// Start voice control
startVoiceControl();

// Update configuration
updateVoiceControlConfig({
  language: 'es-ES',
  confidenceThreshold: 0.8,
  wakeWord: 'Hey ChordMe',
  continuous: true,
});
```

## Voice Commands

### English Commands

#### Playback Control
- "Play" / "Start" / "Begin" / "Resume"
- "Pause" / "Stop" / "Halt"
- "Next" / "Next song" / "Skip" / "Forward"
- "Previous" / "Back" / "Last song" / "Go back"

#### Volume Control
- "Volume up" / "Louder" / "Increase volume" / "Turn up"
- "Volume down" / "Quieter" / "Decrease volume" / "Turn down"
- "Mute" / "Silence" / "Quiet"

#### Navigation
- "Scroll up" / "Go up" / "Move up"
- "Scroll down" / "Go down" / "Move down"
- "Auto scroll" / "Automatic scroll" / "Toggle auto scroll"
- "Emergency stop" / "Stop everything" / "Emergency"

#### UI Control
- "Fullscreen" / "Full screen" / "Maximize"

### Spanish Commands (Español)

#### Control de Reproducción
- "Reproducir" / "Empezar" / "Iniciar"
- "Pausar" / "Parar" / "Detener"
- "Siguiente" / "Próxima canción" / "Adelante"
- "Anterior" / "Canción anterior" / "Atrás"

#### Control de Volumen
- "Subir volumen" / "Más alto" / "Aumentar volumen"
- "Bajar volumen" / "Más bajo" / "Disminuir volumen"
- "Silencio" / "Mutear"

#### Emergency Commands
- "Parada de emergencia" / "Detener todo" / "Emergencia"

### Custom Commands

Add your own voice commands:

```typescript
const customCommand: VoiceCommand = {
  id: 'my-command',
  patterns: ['my custom phrase', 'another way to say it'],
  action: 'custom_action',
  description: 'My custom voice command',
  enabled: true,
};

voiceControlService.addCustomCommand(customCommand);
```

## Remote Control Commands

### Command Types

```typescript
type RemoteCommandType = 
  // Playback
  | 'play' | 'pause' | 'stop' | 'next' | 'previous'
  
  // Volume
  | 'volume_up' | 'volume_down' | 'mute'
  
  // Speed
  | 'speed_up' | 'speed_down' | 'speed_reset'
  
  // Seeking
  | 'seek_forward' | 'seek_backward' | 'seek_to'
  
  // Transpose
  | 'transpose_up' | 'transpose_down' | 'transpose_reset'
  
  // Scrolling
  | 'scroll_up' | 'scroll_down' | 'scroll_to_top' | 'scroll_to_bottom'
  
  // Auto-scroll
  | 'auto_scroll_toggle' | 'auto_scroll_speed'
  
  // Emergency
  | 'emergency_stop' | 'manual_override'
  
  // UI
  | 'fullscreen_toggle' | 'theme_toggle'
  
  // Markers and loops
  | 'marker_add' | 'marker_jump' | 'loop_toggle';
```

### Device Types

```typescript
type DeviceType = 
  | 'smartphone'      // Mobile phones
  | 'tablet'          // Tablets and iPads
  | 'presenter_remote' // Wireless presenter remotes
  | 'foot_pedal'      // Foot pedals and switches
  | 'voice'           // Voice recognition
  | 'keyboard';       // Keyboard shortcuts
```

### Executing Commands

```typescript
const command: RemoteCommand = {
  id: 'unique-command-id',
  type: 'play',
  payload: { /* optional parameters */ },
  timestamp: Date.now(),
  deviceId: 'device-identifier',
  deviceType: 'smartphone',
};

remoteControlService.executeCommand(command);
```

## Device Integration

### Smartphone/Tablet Remote

1. **Enable Remote Control** in ChordMe settings
2. **Display QR Code** for device pairing
3. **Scan QR Code** with mobile device
4. **Connect** to WebSocket server
5. **Send Commands** via simple HTTP requests or WebSocket messages

#### Connection URL Format
```
ws://[host]:[port]/remote?token=[auth-token]
```

#### Example Mobile App Code
```javascript
// Connect to ChordMe
const socket = new WebSocket('ws://localhost:8080/remote');

// Send play command
socket.send(JSON.stringify({
  type: 'play',
  deviceId: 'my-phone',
  deviceType: 'smartphone',
  timestamp: Date.now()
}));
```

### Presenter Remote Support

ChordMe supports standard wireless presenter remotes via WebHID:

#### Supported Actions
- **Page Down / Right Arrow**: Next song/section
- **Page Up / Left Arrow**: Previous song/section  
- **F5 / Play Button**: Start playback
- **Escape / Stop Button**: Pause playback
- **Blank Screen**: Emergency stop

#### Setup
1. **Connect** presenter remote via USB or Bluetooth
2. **Enable Presenter Remote** in ChordMe settings
3. **Test Controls** with your specific device
4. **Customize Mappings** if needed

### Foot Pedal Integration

Foot pedals provide hands-free control for performers:

#### Common Foot Pedal Actions
- **Left Pedal**: Previous chord/section
- **Right Pedal**: Next chord/section
- **Both Pedals**: Emergency stop
- **Long Press**: Toggle auto-scroll

#### HID Device Support
ChordMe uses WebHID to communicate with foot pedals:

```typescript
// Detect foot pedal connection
navigator.hid.addEventListener('connect', (event) => {
  const device = event.device;
  if (device.productName.toLowerCase().includes('foot')) {
    // Configure foot pedal
    setupFootPedal(device);
  }
});
```

## Emergency Stop System

Multiple ways to immediately halt all operations:

### Activation Methods

1. **Keyboard Shortcut**: `Ctrl + Alt + Escape`
2. **Voice Command**: "Emergency stop" / "Parada de emergencia"
3. **Remote Command**: Any connected device can trigger
4. **UI Button**: Emergency stop button in control panel
5. **Foot Pedal**: Both pedals simultaneously (configurable)

### Emergency Stop Behavior

When activated:
- ✅ **Auto-scroll immediately stops**
- ✅ **All animations halt instantly**
- ✅ **Remote commands blocked** (except emergency clear)
- ✅ **Voice recognition paused**
- ✅ **Visual indicators** show emergency state
- ✅ **Manual control restored** immediately

### Clearing Emergency Stop

Emergency stop can be cleared by:
- Clicking "Clear Emergency Stop" button
- Calling `clearEmergencyStop()` method
- Voice command: "Clear emergency" / "Resume"

## Event Handling

### Auto-Scroll Events

```typescript
autoScrollService.addEventListener('scrollComplete', (data) => {
  console.log('Scroll completed to position:', data.position);
});

autoScrollService.addEventListener('emergencyStop', () => {
  console.log('Emergency stop activated!');
});

autoScrollService.addEventListener('manualOverride', (data) => {
  console.log('Manual override:', data.active ? 'started' : 'ended');
});
```

### Remote Control Events

```typescript
remoteControlService.addEventListener('deviceConnected', (data) => {
  console.log('New device connected:', data.device.name);
});

remoteControlService.addEventListener('commandExecuted', (data) => {
  console.log('Command executed:', data.command.type);
});

remoteControlService.addEventListener('emergencyStop', () => {
  // Handle emergency stop from remote device
});
```

### Voice Control Events

```typescript
voiceControlService.addEventListener('commandRecognized', (data) => {
  console.log('Voice command:', data.command.action);
  console.log('Confidence:', data.confidence);
});

voiceControlService.addEventListener('speechResult', (data) => {
  console.log('Speech recognized:', data.result.transcript);
});
```

## Advanced Usage

### Smart Scrolling with Song Structure

Configure smart scrolling to understand song sections:

```typescript
const smartContext = {
  currentSection: 'verse',
  nextSection: 'chorus',
  sectionBoundaries: [
    { time: 0, section: 'intro' },
    { time: 30, section: 'verse' },
    { time: 60, section: 'chorus' },
    { time: 90, section: 'verse' },
    { time: 120, section: 'chorus' },
    { time: 150, section: 'bridge' },
    { time: 180, section: 'chorus' },
    { time: 210, section: 'outro' },
  ],
  tempo: 120,
  timeSignature: '4/4',
};

autoScrollService.setSmartContext(smartContext);
```

### Custom Device Permissions

Control what each device type can do:

```typescript
const devicePermissions: RemotePermission[] = [
  'playback_control',  // Play, pause, stop
  'volume_control',    // Volume up/down, mute
  'navigation',        // Next, previous, seek
  'transpose',         // Transpose up/down
  'auto_scroll',       // Auto-scroll controls
  'emergency_stop',    // Emergency stop capability
  'fullscreen',        // UI controls
  'markers',           // Marker management
  'loop_control',      // Loop section controls
];
```

### Performance Optimization

Configure for optimal performance:

```typescript
// High-performance settings
updateAutoScrollConfig({
  speed: 1.0,
  smoothness: 0.6,      // Less smooth = better performance
  behavior: 'instant',   // No animations = best performance
  anticipation: 1.0,     // Shorter anticipation
});

// Reduce remote control overhead
updateRemoteControlConfig({
  maxConnections: 5,     // Limit connections
  heartbeatInterval: 10000, // Longer intervals
});

// Optimize voice recognition
updateVoiceControlConfig({
  continuous: false,     // Manual activation
  confidenceThreshold: 0.8, // Higher threshold
  noiseFilter: true,     // Enable filtering
});
```

## Browser Compatibility

### Supported Browsers

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|---------|------|
| Auto-Scroll | ✅ | ✅ | ✅ | ✅ |
| Remote Control | ✅ | ✅ | ✅ | ✅ |
| Voice Control | ✅ | ❌ | ✅ | ✅ |
| WebHID (Foot Pedals) | ✅ | ❌ | ❌ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |

### Minimum Versions
- **Chrome**: 66+
- **Firefox**: 60+ (limited voice support)
- **Safari**: 14+
- **Edge**: 79+

### Feature Detection

```typescript
// Check voice control support
if (voiceControlService.isSupported()) {
  startVoiceControl();
} else {
  console.log('Voice control not available');
}

// Check WebHID support
if ('hid' in navigator) {
  setupHIDDevices();
} else {
  console.log('HID devices not supported');
}
```

## Troubleshooting

### Common Issues

#### Auto-Scroll Not Working
- ✅ Check if `enableAutoScroll` is true
- ✅ Verify scroll container is set
- ✅ Ensure not in emergency stop state
- ✅ Check if manual override is active

#### Remote Control Connection Issues
- ✅ Verify WebSocket server is running
- ✅ Check firewall settings for port access
- ✅ Ensure devices are on same network
- ✅ Try refreshing the QR code

#### Voice Control Not Responding
- ✅ Check browser compatibility (Chrome/Safari/Edge)
- ✅ Grant microphone permissions
- ✅ Verify confidence threshold settings
- ✅ Test with louder, clearer speech

#### Foot Pedal Not Detected
- ✅ Use Chrome or Edge (WebHID required)
- ✅ Grant HID device permissions
- ✅ Check device compatibility
- ✅ Try USB connection if Bluetooth fails

### Debug Mode

Enable debug logging:

```typescript
// Enable debug mode
localStorage.setItem('chordme-debug', 'true');

// View debug information
console.log('Auto-scroll state:', autoScrollService.getCurrentPosition());
console.log('Connected devices:', remoteControlService.getState().connectedDevices);
console.log('Voice commands:', voiceControlService.getAvailableCommands());
```

### Performance Monitoring

Monitor system performance:

```typescript
// Performance metrics
const metrics = {
  autoScrollLatency: performance.now(), // Scroll response time
  voiceRecognitionDelay: Date.now(),    // Voice processing time
  remoteCommandLatency: Date.now(),     // Remote command response
};

// Monitor memory usage
console.log('Memory usage:', performance.memory);
```

## Security Considerations

### Remote Control Security

- **Authentication**: Optional token-based authentication
- **Origin Validation**: Restrict connections by origin
- **Rate Limiting**: Prevent command flooding
- **Permission System**: Granular device capabilities
- **Connection Limits**: Maximum concurrent devices

```typescript
updateRemoteControlConfig({
  authToken: 'your-secure-token',
  allowedOrigins: ['https://yourdomain.com'],
  maxConnections: 10,
});
```

### Voice Control Privacy

- **Local Processing**: Speech recognition happens locally
- **No Recording**: Audio is not stored or transmitted
- **Permission Required**: User must grant microphone access
- **Wake Word**: Optional privacy protection

### Data Protection

- **No External Services**: All processing happens locally
- **Secure WebSockets**: WSS support for encrypted connections
- **Local Storage**: Configuration stored locally only

## API Reference

### AutoScrollService

```typescript
class AutoScrollService {
  // Configuration
  updateConfig(config: Partial<AutoScrollConfig>): void;
  getConfig(): AutoScrollConfig;
  
  // Scrolling
  scrollToChord(chord: ChordTimeMapping, element: HTMLElement, currentTime: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  
  // Emergency
  emergencyStop(): void;
  clearEmergencyStop(): void;
  
  // State
  isActive(): boolean;
  isManualOverrideActive(): boolean;
  getCurrentPosition(): ScrollPosition | null;
  
  // Setup
  setScrollContainer(container: HTMLElement): void;
  setSmartContext(context: SmartScrollContext): void;
  updateTempo(bpm: number): void;
}
```

### RemoteControlService

```typescript
class RemoteControlService {
  // Server management
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Configuration
  updateConfig(config: Partial<RemoteControlConfig>): void;
  getConfig(): RemoteControlConfig;
  getState(): RemoteControlState;
  
  // Commands
  executeCommand(command: RemoteCommand): void;
  
  // Emergency
  emergencyStop(): void;
  clearEmergencyLock(): void;
}
```

### VoiceControlService

```typescript
class VoiceControlService {
  // Recognition control
  startListening(): void;
  stopListening(): void;
  
  // Configuration
  updateConfig(config: Partial<VoiceControlConfig>): void;
  getConfig(): VoiceControlConfig;
  getState(): VoiceControlState;
  
  // Commands
  addCustomCommand(command: VoiceCommand): void;
  removeCustomCommand(commandId: string): void;
  getAvailableCommands(): VoiceCommand[];
  
  // Support detection
  isSupported(): boolean;
}
```

## Contributing

To contribute to the auto-scroll and remote control system:

1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** your changes with tests
4. **Follow** the existing code style
5. **Update** documentation
6. **Submit** a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/tonybolanyo/chordme.git

# Install dependencies
cd chordme
npm install
cd frontend && npm install && cd ..

# Run tests
npm run test:frontend:run

# Start development servers
npm run dev:frontend  # Port 5173
npm run dev:backend   # Port 5000
```

### Testing

```bash
# Run specific tests
npm run test:frontend:run -- autoScrollAndRemoteControl.test.ts

# Run with coverage
npm run test:frontend:coverage

# Run integration tests
npm run test:integration
```

## License

This auto-scroll and remote control system is part of ChordMe and is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

*For more information, visit the [ChordMe repository](https://github.com/tonybolanyo/chordme) or check out the [live demo](auto-scroll-remote-control-demo.html).*