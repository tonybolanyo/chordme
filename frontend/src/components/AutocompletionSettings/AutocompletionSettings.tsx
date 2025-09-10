import React, { useState, useEffect } from 'react';
import './AutocompletionSettings.css';
import { 
  autocompletionSettingsService, 
  type AutocompletionSettings,
  type CustomChord
} from '../../services/autocompletionSettings';

interface AutocompletionSettingsProps {
  onClose?: () => void;
  visible?: boolean;
}

const AutocompletionSettings: React.FC<AutocompletionSettingsProps> = ({
  onClose,
  visible = true,
}) => {
  const [settings, setSettings] = useState<AutocompletionSettings>(() =>
    autocompletionSettingsService.getSettings()
  );
  const [newChord, setNewChord] = useState({
    name: '',
    definition: '',
    description: '',
    category: '',
  });
  const [showAddChord, setShowAddChord] = useState(false);

  useEffect(() => {
    if (visible) {
      setSettings(autocompletionSettingsService.getSettings());
    }
  }, [visible]);

  const handleSettingChange = (key: keyof AutocompletionSettings, value: boolean | number | CustomChord[]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    autocompletionSettingsService.saveSettings({ [key]: value });
  };

  const handleAddCustomChord = () => {
    if (!newChord.name.trim()) {
      alert('Chord name is required');
      return;
    }

    autocompletionSettingsService.addCustomChord({
      name: newChord.name.trim(),
      definition: newChord.definition.trim(),
      description: newChord.description.trim(),
      category: newChord.category.trim(),
    });

    // Refresh settings to get updated custom chords
    setSettings(autocompletionSettingsService.getSettings());
    
    // Reset form
    setNewChord({ name: '', definition: '', description: '', category: '' });
    setShowAddChord(false);
  };

  const handleRemoveCustomChord = (chordName: string) => {
    if (confirm(`Remove chord "${chordName}"?`)) {
      autocompletionSettingsService.removeCustomChord(chordName);
      setSettings(autocompletionSettingsService.getSettings());
    }
  };

  const handleExportData = () => {
    const data = autocompletionSettingsService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chordme-autocompletion-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        autocompletionSettingsService.importData(data);
        setSettings(autocompletionSettingsService.getSettings());
        alert('Settings imported successfully!');
      } catch {
        alert('Error importing settings: Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      autocompletionSettingsService.resetSettings();
      autocompletionSettingsService.clearCustomChords();
      setSettings(autocompletionSettingsService.getSettings());
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="autocompletion-settings-overlay">
      <div className="autocompletion-settings">
        <div className="settings-header">
          <h2>Autocompletion Settings</h2>
          {onClose && (
            <button className="close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        <div className="settings-content">
          {/* General Settings */}
          <section className="settings-section">
            <h3>General</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                />
                Enable autocompletion
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                Max suggestions:
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxSuggestions}
                  onChange={(e) => handleSettingChange('maxSuggestions', parseInt(e.target.value) || 8)}
                  className="number-input"
                />
              </label>
            </div>
          </section>

          {/* Feature Toggles */}
          <section className="settings-section">
            <h3>Features</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showChords}
                  onChange={(e) => handleSettingChange('showChords', e.target.checked)}
                />
                Show chord suggestions
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showDirectives}
                  onChange={(e) => handleSettingChange('showDirectives', e.target.checked)}
                />
                Show ChordPro directive suggestions
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.contextAware}
                  onChange={(e) => handleSettingChange('contextAware', e.target.checked)}
                />
                Context-aware chord suggestions (boost chords in current key)
              </label>
            </div>
          </section>

          {/* Custom Chords */}
          <section className="settings-section">
            <h3>Custom Chords ({settings.customChords.length})</h3>
            <div className="custom-chords-actions">
              <button
                className="add-chord-button"
                onClick={() => setShowAddChord(!showAddChord)}
              >
                {showAddChord ? 'Cancel' : 'Add Custom Chord'}
              </button>
            </div>

            {showAddChord && (
              <div className="add-chord-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Chord name (e.g., Cmyth)"
                    value={newChord.name}
                    onChange={(e) => setNewChord({ ...newChord, name: e.target.value })}
                    className="chord-input"
                  />
                  <input
                    type="text"
                    placeholder="Definition (e.g., 3 0 2 0 1 0)"
                    value={newChord.definition}
                    onChange={(e) => setNewChord({ ...newChord, definition: e.target.value })}
                    className="chord-input"
                  />
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newChord.description}
                    onChange={(e) => setNewChord({ ...newChord, description: e.target.value })}
                    className="chord-input"
                  />
                  <input
                    type="text"
                    placeholder="Category (optional)"
                    value={newChord.category}
                    onChange={(e) => setNewChord({ ...newChord, category: e.target.value })}
                    className="chord-input"
                  />
                </div>
                <button
                  className="save-chord-button"
                  onClick={handleAddCustomChord}
                  disabled={!newChord.name.trim()}
                >
                  Add Chord
                </button>
              </div>
            )}

            <div className="custom-chords-list">
              {settings.customChords.map((chord, index) => (
                <div key={index} className="custom-chord-item">
                  <div className="chord-info">
                    <span className="chord-name">{chord.name}</span>
                    {chord.description && (
                      <span className="chord-description">{chord.description}</span>
                    )}
                    {chord.definition && (
                      <span className="chord-definition">{chord.definition}</span>
                    )}
                  </div>
                  <button
                    className="remove-chord-button"
                    onClick={() => handleRemoveCustomChord(chord.name)}
                    aria-label={`Remove ${chord.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {settings.customChords.length === 0 && (
                <p className="no-chords">No custom chords added yet.</p>
              )}
            </div>
          </section>

          {/* Data Management */}
          <section className="settings-section">
            <h3>Data Management</h3>
            <div className="data-actions">
              <button className="export-button" onClick={handleExportData}>
                Export Settings
              </button>
              <label className="import-button">
                Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                className="reset-button danger"
                onClick={handleResetSettings}
              >
                Reset to Defaults
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AutocompletionSettings;