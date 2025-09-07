/**
 * Voice Control Service
 * Provides hands-free voice control using Web Speech API
 * Supports multiple languages and custom voice commands
 */

export interface VoiceControlConfig {
  enabled: boolean;
  language: string; // e.g., 'en-US', 'es-ES'
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number; // 0-1
  noiseFilter: boolean;
  customCommands: VoiceCommand[];
  wakeWord?: string; // Optional wake word
  commandTimeout: number; // milliseconds
}

export interface VoiceCommand {
  id: string;
  patterns: string[]; // Multiple ways to say the command
  action: string; // Action to execute
  parameters?: Record<string, any>;
  description: string;
  language?: string; // If specific to a language
  enabled: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  timestamp: Date;
}

export interface VoiceControlState {
  isListening: boolean;
  isSupported: boolean;
  currentLanguage: string;
  lastResult?: VoiceRecognitionResult;
  recognitionError?: string;
  isProcessingCommand: boolean;
  wakeWordDetected: boolean;
}

export class VoiceControlService {
  private config: VoiceControlConfig = {
    enabled: false,
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    confidenceThreshold: 0.7,
    noiseFilter: true,
    customCommands: [],
    commandTimeout: 5000,
  };

  private state: VoiceControlState = {
    isListening: false,
    isSupported: false,
    currentLanguage: 'en-US',
    isProcessingCommand: false,
    wakeWordDetected: false,
  };

  private recognition: SpeechRecognition | null = null;
  private defaultCommands: VoiceCommand[] = [];
  private eventListeners = new Map<string, Set<Function>>();
  private commandTimeout: NodeJS.Timeout | null = null;
  private lastCommandTime = 0;

  constructor() {
    this.detectSupport();
    this.setupDefaultCommands();
    this.initializeRecognition();
  }

  private detectSupport(): void {
    this.state.isSupported = !!(
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window
    );
  }

  private initializeRecognition(): void {
    if (!this.state.isSupported) {
      console.warn('Speech recognition is not supported in this browser');
      return;
    }

    try {
      const SpeechRecognitionClass = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      this.recognition = new SpeechRecognitionClass();
      this.setupRecognitionHandlers();
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.state.isSupported = false;
    }
  }

  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.addEventListener('start', () => {
      this.state.isListening = true;
      this.emit('listeningStarted', {});
    });

    this.recognition.addEventListener('end', () => {
      this.state.isListening = false;
      this.emit('listeningEnded', {});
      
      // Restart if continuous mode is enabled
      if (this.config.enabled && this.config.continuous) {
        setTimeout(() => this.startListening(), 100);
      }
    });

    this.recognition.addEventListener('result', (event) => {
      this.handleSpeechResult(event);
    });

    this.recognition.addEventListener('error', (event) => {
      this.handleSpeechError(event);
    });

    this.recognition.addEventListener('nomatch', () => {
      this.emit('noMatch', {});
    });

    this.recognition.addEventListener('soundstart', () => {
      this.emit('soundDetected', {});
    });

    this.recognition.addEventListener('speechstart', () => {
      this.emit('speechDetected', {});
    });

    this.recognition.addEventListener('speechend', () => {
      this.emit('speechEnded', {});
    });
  }

  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const results = Array.from(event.results);
    const lastResult = results[results.length - 1];
    
    if (!lastResult) return;

    const transcript = lastResult[0].transcript;
    const confidence = lastResult[0].confidence;
    const isFinal = lastResult.isFinal;

    const alternatives = Array.from(lastResult).map(result => ({
      transcript: result.transcript,
      confidence: result.confidence,
    }));

    const recognitionResult: VoiceRecognitionResult = {
      transcript,
      confidence,
      isFinal,
      alternatives,
      timestamp: new Date(),
    };

    this.state.lastResult = recognitionResult;
    this.emit('speechResult', { result: recognitionResult });

    // Process the command if it meets the confidence threshold
    if (confidence >= this.config.confidenceThreshold) {
      if (this.config.wakeWord) {
        this.handleWakeWordDetection(transcript);
      } else {
        this.processVoiceCommand(transcript, confidence);
      }
    }
  }

  private handleWakeWordDetection(transcript: string): void {
    const normalizedTranscript = transcript.toLowerCase().trim();
    const wakeWord = this.config.wakeWord?.toLowerCase();

    if (wakeWord && normalizedTranscript.includes(wakeWord)) {
      this.state.wakeWordDetected = true;
      this.emit('wakeWordDetected', { transcript });
      
      // Start command timeout
      this.startCommandTimeout();
      
      // Extract command after wake word
      const commandStart = normalizedTranscript.indexOf(wakeWord) + wakeWord.length;
      const command = normalizedTranscript.substring(commandStart).trim();
      
      if (command) {
        this.processVoiceCommand(command, this.state.lastResult?.confidence || 1);
      }
    } else if (this.state.wakeWordDetected) {
      // Process as command if wake word was recently detected
      this.processVoiceCommand(transcript, this.state.lastResult?.confidence || 1);
    }
  }

  private startCommandTimeout(): void {
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
    }

    this.commandTimeout = setTimeout(() => {
      this.state.wakeWordDetected = false;
      this.emit('commandTimeout', {});
    }, this.config.commandTimeout);
  }

  private processVoiceCommand(transcript: string, confidence: number): void {
    if (this.state.isProcessingCommand) return;

    this.state.isProcessingCommand = true;
    this.lastCommandTime = Date.now();

    try {
      const command = this.matchVoiceCommand(transcript);
      
      if (command) {
        this.emit('commandRecognized', { 
          command, 
          transcript, 
          confidence 
        });
        
        this.executeVoiceCommand(command, transcript, confidence);
      } else {
        this.emit('commandNotRecognized', { 
          transcript, 
          confidence 
        });
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      this.emit('commandError', { error, transcript });
    } finally {
      this.state.isProcessingCommand = false;
      
      if (this.config.wakeWord) {
        this.state.wakeWordDetected = false;
      }
    }
  }

  private matchVoiceCommand(transcript: string): VoiceCommand | null {
    const normalizedTranscript = transcript.toLowerCase().trim();
    const allCommands = [...this.defaultCommands, ...this.config.customCommands];
    
    // Find the best matching command
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    for (const command of allCommands) {
      if (!command.enabled) continue;
      if (command.language && command.language !== this.config.language) continue;

      for (const pattern of command.patterns) {
        const normalizedPattern = pattern.toLowerCase();
        const score = this.calculateMatchScore(normalizedTranscript, normalizedPattern);
        
        if (score > bestScore && score > 0.6) { // Minimum match threshold
          bestMatch = command;
          bestScore = score;
        }
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(transcript: string, pattern: string): number {
    // Simple fuzzy matching algorithm
    const transcriptWords = transcript.split(' ');
    const patternWords = pattern.split(' ');
    
    let matchedWords = 0;
    
    for (const patternWord of patternWords) {
      for (const transcriptWord of transcriptWords) {
        if (this.isWordMatch(transcriptWord, patternWord)) {
          matchedWords++;
          break;
        }
      }
    }
    
    return matchedWords / patternWords.length;
  }

  private isWordMatch(word1: string, word2: string): boolean {
    // Exact match
    if (word1 === word2) return true;
    
    // Fuzzy match for similar words
    if (word1.length >= 3 && word2.length >= 3) {
      const similarity = this.calculateSimilarity(word1, word2);
      return similarity > 0.8;
    }
    
    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null)
      .map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private executeVoiceCommand(
    command: VoiceCommand, 
    transcript: string, 
    confidence: number
  ): void {
    // Extract parameters from transcript if needed
    const parameters = this.extractCommandParameters(command, transcript);
    
    this.emit('commandExecute', {
      action: command.action,
      parameters: { ...command.parameters, ...parameters },
      transcript,
      confidence,
      commandId: command.id,
    });
  }

  private extractCommandParameters(command: VoiceCommand, transcript: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract numbers for volume, speed, etc.
    const numberMatch = transcript.match(/(\d+)/);
    if (numberMatch) {
      parameters.value = parseInt(numberMatch[1]);
    }
    
    // Extract percentages
    const percentMatch = transcript.match(/(\d+)\s*percent/);
    if (percentMatch) {
      parameters.percentage = parseInt(percentMatch[1]);
    }
    
    // Extract time references
    const timeMatch = transcript.match(/(\d+)\s*(second|minute|hour)s?/);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      parameters.time = unit === 'minute' ? value * 60 : 
                     unit === 'hour' ? value * 3600 : value;
    }
    
    return parameters;
  }

  private handleSpeechError(event: SpeechRecognitionErrorEvent): void {
    console.error('Speech recognition error:', event.error);
    
    this.state.recognitionError = event.error;
    this.emit('recognitionError', { 
      error: event.error, 
      message: event.message 
    });

    // Handle specific errors
    switch (event.error) {
      case 'no-speech':
        // Restart recognition after a short delay
        setTimeout(() => {
          if (this.config.enabled) {
            this.startListening();
          }
        }, 1000);
        break;
        
      case 'audio-capture':
        this.emit('microphoneError', { error: event.error });
        break;
        
      case 'not-allowed':
        this.emit('permissionDenied', { error: event.error });
        break;
    }
  }

  private setupDefaultCommands(): void {
    this.defaultCommands = [
      // Playback commands
      {
        id: 'play',
        patterns: ['play', 'start', 'begin', 'resume'],
        action: 'play',
        description: 'Start playback',
        enabled: true,
      },
      {
        id: 'pause',
        patterns: ['pause', 'stop', 'halt'],
        action: 'pause',
        description: 'Pause playback',
        enabled: true,
      },
      {
        id: 'next',
        patterns: ['next', 'next song', 'skip', 'forward'],
        action: 'next',
        description: 'Go to next song',
        enabled: true,
      },
      {
        id: 'previous',
        patterns: ['previous', 'back', 'last song', 'go back'],
        action: 'previous',
        description: 'Go to previous song',
        enabled: true,
      },
      
      // Volume commands
      {
        id: 'volume_up',
        patterns: ['volume up', 'louder', 'increase volume', 'turn up'],
        action: 'volume_up',
        description: 'Increase volume',
        enabled: true,
      },
      {
        id: 'volume_down',
        patterns: ['volume down', 'quieter', 'decrease volume', 'turn down'],
        action: 'volume_down',
        description: 'Decrease volume',
        enabled: true,
      },
      {
        id: 'mute',
        patterns: ['mute', 'silence', 'quiet'],
        action: 'mute',
        description: 'Mute audio',
        enabled: true,
      },
      
      // Navigation commands
      {
        id: 'scroll_up',
        patterns: ['scroll up', 'go up', 'move up'],
        action: 'scroll_up',
        description: 'Scroll up',
        enabled: true,
      },
      {
        id: 'scroll_down',
        patterns: ['scroll down', 'go down', 'move down'],
        action: 'scroll_down',
        description: 'Scroll down',
        enabled: true,
      },
      {
        id: 'auto_scroll_toggle',
        patterns: ['auto scroll', 'automatic scroll', 'toggle auto scroll'],
        action: 'auto_scroll_toggle',
        description: 'Toggle auto-scroll',
        enabled: true,
      },
      
      // Emergency commands
      {
        id: 'emergency_stop',
        patterns: ['emergency stop', 'stop everything', 'emergency'],
        action: 'emergency_stop',
        description: 'Emergency stop all operations',
        enabled: true,
      },
      
      // UI commands
      {
        id: 'fullscreen',
        patterns: ['fullscreen', 'full screen', 'maximize'],
        action: 'fullscreen_toggle',
        description: 'Toggle fullscreen mode',
        enabled: true,
      },
      
      // Spanish commands
      {
        id: 'play_es',
        patterns: ['reproducir', 'empezar', 'iniciar'],
        action: 'play',
        description: 'Iniciar reproducción',
        language: 'es-ES',
        enabled: true,
      },
      {
        id: 'pause_es',
        patterns: ['pausar', 'parar', 'detener'],
        action: 'pause',
        description: 'Pausar reproducción',
        language: 'es-ES',
        enabled: true,
      },
      {
        id: 'next_es',
        patterns: ['siguiente', 'próxima canción', 'adelante'],
        action: 'next',
        description: 'Siguiente canción',
        language: 'es-ES',
        enabled: true,
      },
      {
        id: 'volume_up_es',
        patterns: ['subir volumen', 'más alto', 'aumentar volumen'],
        action: 'volume_up',
        description: 'Subir volumen',
        language: 'es-ES',
        enabled: true,
      },
      {
        id: 'emergency_stop_es',
        patterns: ['parada de emergencia', 'detener todo', 'emergencia'],
        action: 'emergency_stop',
        description: 'Parada de emergencia',
        language: 'es-ES',
        enabled: true,
      },
    ];
  }

  // Public API
  updateConfig(newConfig: Partial<VoiceControlConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }

    this.state.currentLanguage = this.config.language;

    if (!wasEnabled && this.config.enabled) {
      this.startListening();
    } else if (wasEnabled && !this.config.enabled) {
      this.stopListening();
    }

    this.emit('configUpdate', { config: this.config });
  }

  getConfig(): VoiceControlConfig {
    return { ...this.config };
  }

  getState(): VoiceControlState {
    return { ...this.state };
  }

  isSupported(): boolean {
    return this.state.isSupported;
  }

  startListening(): void {
    if (!this.state.isSupported || !this.recognition || this.state.isListening) {
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.emit('startError', { error });
    }
  }

  stopListening(): void {
    if (!this.recognition || !this.state.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  addCustomCommand(command: VoiceCommand): void {
    this.config.customCommands.push(command);
    this.emit('commandAdded', { command });
  }

  removeCustomCommand(commandId: string): void {
    const index = this.config.customCommands.findIndex(cmd => cmd.id === commandId);
    if (index >= 0) {
      const removed = this.config.customCommands.splice(index, 1)[0];
      this.emit('commandRemoved', { command: removed });
    }
  }

  getAvailableCommands(): VoiceCommand[] {
    return [...this.defaultCommands, ...this.config.customCommands]
      .filter(cmd => cmd.enabled)
      .filter(cmd => !cmd.language || cmd.language === this.config.language);
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
          console.error(`Error in voice control event listener for ${type}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    this.stopListening();
    
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
    }
    
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const voiceControlService = new VoiceControlService();