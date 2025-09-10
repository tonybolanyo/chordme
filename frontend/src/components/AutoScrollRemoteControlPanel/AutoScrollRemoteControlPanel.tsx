/**
 * Auto-Scroll and Remote Control Panel
 * Provides UI controls for configuring auto-scroll and remote control features
 */

import React, { useState, useEffect } from 'react';
import { useAutoScrollAndRemoteControl } from '../../hooks/useAutoScrollAndRemoteControl';
import './AutoScrollRemoteControlPanel.css';

export interface AutoScrollRemoteControlPanelProps {
  className?: string;
  compact?: boolean;
  showAdvanced?: boolean;
}

export const AutoScrollRemoteControlPanel: React.FC<AutoScrollRemoteControlPanelProps> = ({
  className = '',
  compact = false,
  showAdvanced = false,
}) => {
  const {
    // Auto-scroll
    autoScrollConfig,
    updateAutoScrollConfig,
    isAutoScrollActive,
    isEmergencyStopped,
    isManualOverrideActive,
    pauseAutoScroll,
    resumeAutoScroll,
    stopAutoScroll,
    emergencyStopAutoScroll,
    clearEmergencyStop,

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
    isVoiceControlSupported,
    startVoiceControl,
    stopVoiceControl,
    lastVoiceResult,
  } = useAutoScrollAndRemoteControl({
    enableAutoScroll: true,
    enableRemoteControl: true,
    enableVoiceControl: true,
  });

  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'autoscroll' | 'remote' | 'voice'>('autoscroll');

  // Handle emergency stop keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key === 'Escape') {
        emergencyStopAutoScroll();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emergencyStopAutoScroll]);

  const handleAutoScrollToggle = () => {
    updateAutoScrollConfig({ enabled: !autoScrollConfig.enabled });
  };

  const handleSpeedChange = (speed: number) => {
    updateAutoScrollConfig({ speed: Math.max(0.1, Math.min(5.0, speed)) });
  };

  const handleSmoothnessChange = (smoothness: number) => {
    updateAutoScrollConfig({ smoothness: Math.max(0.1, Math.min(1.0, smoothness)) });
  };

  const handleBehaviorChange = (behavior: 'smooth' | 'instant' | 'progressive') => {
    updateAutoScrollConfig({ behavior });
  };

  const handleRemoteControlToggle = async () => {
    if (remoteControlConfig.enabled) {
      await stopRemoteControl();
      updateRemoteControlConfig({ enabled: false });
    } else {
      updateRemoteControlConfig({ enabled: true });
      await startRemoteControl();
    }
  };

  const handleVoiceControlToggle = () => {
    if (voiceControlConfig.enabled) {
      stopVoiceControl();
      updateVoiceControlConfig({ enabled: false });
    } else {
      updateVoiceControlConfig({ enabled: true });
      startVoiceControl();
    }
  };

  const formatConfidence = (confidence?: number) => {
    return confidence ? `${Math.round(confidence * 100)}%` : 'N/A';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'smartphone': return '📱';
      case 'tablet': return '📟';
      case 'presenter_remote': return '🎮';
      case 'foot_pedal': return '🦶';
      case 'voice': return '🎤';
      case 'keyboard': return '⌨️';
      default: return '📱';
    }
  };

  if (compact) {
    return (
      <div className={`auto-scroll-remote-panel compact ${className}`}>
        <div className="compact-controls">
          <button
            className={`toggle-btn ${autoScrollConfig.enabled ? 'active' : ''}`}
            onClick={handleAutoScrollToggle}
            title="Toggle Auto-Scroll"
            disabled={isEmergencyStopped}
          >
            📜 {autoScrollConfig.enabled ? 'ON' : 'OFF'}
          </button>
          
          <button
            className={`toggle-btn ${remoteControlConfig.enabled ? 'active' : ''}`}
            onClick={handleRemoteControlToggle}
            title="Toggle Remote Control"
          >
            🎮 {remoteControlConfig.enabled ? 'ON' : 'OFF'}
          </button>
          
          {isVoiceControlSupported && (
            <button
              className={`toggle-btn ${voiceControlConfig.enabled ? 'active' : ''}`}
              onClick={handleVoiceControlToggle}
              title="Toggle Voice Control"
            >
              🎤 {voiceControlConfig.enabled ? 'ON' : 'OFF'}
            </button>
          )}
          
          {isEmergencyStopped && (
            <button
              className="emergency-clear-btn"
              onClick={clearEmergencyStop}
              title="Clear Emergency Stop"
            >
              🚨 CLEAR
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`auto-scroll-remote-panel ${className}`}>
      <div className="panel-header">
        <h3>Auto-Scroll & Remote Control</h3>
        {isEmergencyStopped && (
          <div className="emergency-banner">
            <span className="emergency-icon">🚨</span>
            <span>EMERGENCY STOP ACTIVE</span>
            <button onClick={clearEmergencyStop} className="clear-emergency-btn">
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'autoscroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('autoscroll')}
        >
          📜 Auto-Scroll
        </button>
        <button
          className={`tab ${activeTab === 'remote' ? 'active' : ''}`}
          onClick={() => setActiveTab('remote')}
        >
          🎮 Remote Control
        </button>
        {isVoiceControlSupported && (
          <button
            className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            🎤 Voice Control
          </button>
        )}
      </div>

      <div className="panel-content">
        {activeTab === 'autoscroll' && (
          <div className="autoscroll-panel">
            <div className="control-group">
              <div className="control-header">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={autoScrollConfig.enabled}
                    onChange={handleAutoScrollToggle}
                    disabled={isEmergencyStopped}
                  />
                  Enable Auto-Scroll
                </label>
                <div className="status-indicators">
                  {isAutoScrollActive && <span className="status active">🟢 ACTIVE</span>}
                  {isManualOverrideActive && <span className="status override">🟡 MANUAL</span>}
                  {isEmergencyStopped && <span className="status emergency">🔴 STOPPED</span>}
                </div>
              </div>
            </div>

            <div className="control-group">
              <label>
                Speed: {autoScrollConfig.speed.toFixed(1)}x
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={autoScrollConfig.speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  disabled={!autoScrollConfig.enabled || isEmergencyStopped}
                />
              </label>
            </div>

            <div className="control-group">
              <label>
                Smoothness: {Math.round(autoScrollConfig.smoothness * 100)}%
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={autoScrollConfig.smoothness}
                  onChange={(e) => handleSmoothnessChange(parseFloat(e.target.value))}
                  disabled={!autoScrollConfig.enabled || isEmergencyStopped}
                />
              </label>
            </div>

            <div className="control-group">
              <label>
                Behavior:
                <select
                  value={autoScrollConfig.behavior}
                  onChange={(e) => handleBehaviorChange(e.target.value as 'smooth' | 'instant' | 'progressive')}
                  disabled={!autoScrollConfig.enabled || isEmergencyStopped}
                >
                  <option value="smooth">Smooth</option>
                  <option value="instant">Instant</option>
                  <option value="progressive">Progressive</option>
                </select>
              </label>
            </div>

            {showAdvanced && (
              <div className="advanced-controls">
                <h4>Advanced Settings</h4>
                
                <div className="control-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={autoScrollConfig.followTempo}
                      onChange={(e) => updateAutoScrollConfig({ followTempo: e.target.checked })}
                      disabled={!autoScrollConfig.enabled}
                    />
                    Follow Tempo
                  </label>
                </div>

                <div className="control-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={autoScrollConfig.smartScrolling}
                      onChange={(e) => updateAutoScrollConfig({ smartScrolling: e.target.checked })}
                      disabled={!autoScrollConfig.enabled}
                    />
                    Smart Scrolling
                  </label>
                </div>

                <div className="control-group">
                  <label>
                    Anticipation: {autoScrollConfig.anticipation}s
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={autoScrollConfig.anticipation}
                      onChange={(e) => updateAutoScrollConfig({ anticipation: parseFloat(e.target.value) })}
                      disabled={!autoScrollConfig.enabled}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="control-actions">
              <button
                onClick={isAutoScrollActive ? pauseAutoScroll : resumeAutoScroll}
                disabled={!autoScrollConfig.enabled || isEmergencyStopped}
                className="action-btn"
              >
                {isAutoScrollActive ? '⏸️ Pause' : '▶️ Resume'}
              </button>
              <button
                onClick={stopAutoScroll}
                disabled={!autoScrollConfig.enabled}
                className="action-btn"
              >
                ⏹️ Stop
              </button>
              <button
                onClick={emergencyStopAutoScroll}
                className="emergency-btn"
              >
                🚨 Emergency Stop
              </button>
            </div>
          </div>
        )}

        {activeTab === 'remote' && (
          <div className="remote-panel">
            <div className="control-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={remoteControlConfig.enabled}
                  onChange={handleRemoteControlToggle}
                />
                Enable Remote Control
              </label>
              <div className="status-indicators">
                {remoteControlState.isServerRunning && <span className="status active">🟢 SERVER</span>}
                {connectedDevices.length > 0 && (
                  <span className="status connected">📱 {connectedDevices.length} DEVICE(S)</span>
                )}
              </div>
            </div>

            {remoteControlConfig.enabled && (
              <>
                <div className="connection-info">
                  <div className="connection-url">
                    <label>Connection URL:</label>
                    <code>{remoteControlState.connectionUrl || 'Starting server...'}</code>
                  </div>
                  
                  {remoteControlState.qrCode && (
                    <div className="qr-code-section">
                      <button
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="qr-toggle-btn"
                      >
                        📱 {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                      </button>
                      {showQRCode && (
                        <div className="qr-code">
                          <img src={remoteControlState.qrCode} alt="Connection QR Code" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="connected-devices">
                  <h4>Connected Devices ({connectedDevices.length})</h4>
                  {connectedDevices.length === 0 ? (
                    <p className="no-devices">No devices connected</p>
                  ) : (
                    <div className="device-list">
                      {connectedDevices.map((device) => (
                        <div key={device.id} className="device-item">
                          <span className="device-icon">{getDeviceIcon(device.type)}</span>
                          <div className="device-info">
                            <div className="device-name">{device.name}</div>
                            <div className="device-details">
                              {device.type} • Connected {new Date(device.connectedAt).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="device-status">
                            {device.isActive ? '🟢' : '🔴'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {lastRemoteCommand && (
                  <div className="last-command">
                    <h4>Last Command</h4>
                    <div className="command-details">
                      <div>
                        <strong>{lastRemoteCommand.type}</strong> from {getDeviceIcon(lastRemoteCommand.deviceType)} {lastRemoteCommand.deviceId}
                      </div>
                      <div className="command-time">
                        {new Date(lastRemoteCommand.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {showAdvanced && (
                  <div className="advanced-controls">
                    <h4>Remote Control Settings</h4>
                    
                    <div className="control-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={remoteControlConfig.enablePresenterRemote}
                          onChange={(e) => updateRemoteControlConfig({ enablePresenterRemote: e.target.checked })}
                        />
                        Enable Presenter Remote
                      </label>
                    </div>

                    <div className="control-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={remoteControlConfig.enableFootPedal}
                          onChange={(e) => updateRemoteControlConfig({ enableFootPedal: e.target.checked })}
                        />
                        Enable Foot Pedal
                      </label>
                    </div>

                    <div className="control-group">
                      <label>
                        Max Connections:
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={remoteControlConfig.maxConnections}
                          onChange={(e) => updateRemoteControlConfig({ maxConnections: parseInt(e.target.value) })}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'voice' && isVoiceControlSupported && (
          <div className="voice-panel">
            <div className="control-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={voiceControlConfig.enabled}
                  onChange={handleVoiceControlToggle}
                />
                Enable Voice Control
              </label>
              <div className="status-indicators">
                {voiceControlState.isListening && <span className="status active">🎤 LISTENING</span>}
                {voiceControlState.wakeWordDetected && <span className="status wake">👂 WAKE WORD</span>}
                {voiceControlState.isProcessingCommand && <span className="status processing">⚡ PROCESSING</span>}
              </div>
            </div>

            {voiceControlConfig.enabled && (
              <>
                <div className="control-group">
                  <label>
                    Language:
                    <select
                      value={voiceControlConfig.language}
                      onChange={(e) => updateVoiceControlConfig({ language: e.target.value })}
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Español (España)</option>
                      <option value="es-MX">Español (México)</option>
                      <option value="fr-FR">Français</option>
                      <option value="de-DE">Deutsch</option>
                      <option value="it-IT">Italiano</option>
                      <option value="pt-BR">Português (Brasil)</option>
                    </select>
                  </label>
                </div>

                <div className="control-group">
                  <label>
                    Confidence Threshold: {Math.round(voiceControlConfig.confidenceThreshold * 100)}%
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={voiceControlConfig.confidenceThreshold}
                      onChange={(e) => updateVoiceControlConfig({ confidenceThreshold: parseFloat(e.target.value) })}
                    />
                  </label>
                </div>

                {lastVoiceResult && (
                  <div className="voice-result">
                    <h4>Last Recognition</h4>
                    <div className="result-details">
                      <div><strong>"{lastVoiceResult.transcript}"</strong></div>
                      <div>
                        Confidence: {formatConfidence(lastVoiceResult.confidence)} • 
                        {lastVoiceResult.isFinal ? ' Final' : ' Interim'}
                      </div>
                      <div className="result-time">
                        {lastVoiceResult.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {showAdvanced && (
                  <div className="advanced-controls">
                    <h4>Voice Control Settings</h4>
                    
                    <div className="control-group">
                      <label>
                        Wake Word:
                        <input
                          type="text"
                          value={voiceControlConfig.wakeWord || ''}
                          onChange={(e) => updateVoiceControlConfig({ wakeWord: e.target.value || undefined })}
                          placeholder="Optional (e.g., 'Hey ChordMe')"
                        />
                      </label>
                    </div>

                    <div className="control-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={voiceControlConfig.continuous}
                          onChange={(e) => updateVoiceControlConfig({ continuous: e.target.checked })}
                        />
                        Continuous Listening
                      </label>
                    </div>

                    <div className="control-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={voiceControlConfig.noiseFilter}
                          onChange={(e) => updateVoiceControlConfig({ noiseFilter: e.target.checked })}
                        />
                        Noise Filter
                      </label>
                    </div>
                  </div>
                )}

                <div className="voice-commands-help">
                  <h4>Available Commands</h4>
                  <div className="commands-grid">
                    <div className="command-category">
                      <h5>Playback</h5>
                      <ul>
                        <li>"Play" / "Start"</li>
                        <li>"Pause" / "Stop"</li>
                        <li>"Next" / "Skip"</li>
                        <li>"Previous" / "Back"</li>
                      </ul>
                    </div>
                    <div className="command-category">
                      <h5>Volume</h5>
                      <ul>
                        <li>"Volume up" / "Louder"</li>
                        <li>"Volume down" / "Quieter"</li>
                        <li>"Mute"</li>
                      </ul>
                    </div>
                    <div className="command-category">
                      <h5>Navigation</h5>
                      <ul>
                        <li>"Scroll up"</li>
                        <li>"Scroll down"</li>
                        <li>"Auto scroll"</li>
                        <li>"Emergency stop"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!showAdvanced && (
        <div className="panel-footer">
          <button
            onClick={() => window.open('/docs/auto-scroll-remote-control', '_blank')}
            className="help-btn"
          >
            📚 Help & Documentation
          </button>
        </div>
      )}
    </div>
  );
};