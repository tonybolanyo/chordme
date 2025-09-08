import React, { useState, useRef } from 'react';
import './ContentSubmissionForm.css';

interface ContentData {
  chordpro_content?: string;
  artist?: string;
  genre?: string;
  key?: string;
  tempo?: number;
  time_signature?: string;
  difficulty?: string;
  [key: string]: string | number | undefined;
}

interface LicenseData {
  type: string;
  copyright_holder?: string;
  is_original_work: boolean;
  attribution_text?: string;
  source_url?: string;
  source_notes?: string;
}

interface ContentSubmissionData {
  title: string;
  description: string;
  content_type: string;
  original_song_id?: number;
  content_data: ContentData;
  license: LicenseData;
}

interface ContentSubmissionFormProps {
  onSubmit: (data: ContentSubmissionData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CONTENT_TYPES = [
  { value: 'song', label: 'Original Song' },
  { value: 'arrangement', label: 'Arrangement' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'exercise', label: 'Practice Exercise' },
  { value: 'tab', label: 'Tab/Tablature' }
];

const LICENSE_TYPES = [
  { value: 'original', label: 'Original Work (All Rights Reserved)' },
  { value: 'CC BY 4.0', label: 'Creative Commons - Attribution' },
  { value: 'CC BY-SA 4.0', label: 'Creative Commons - Attribution-ShareAlike' },
  { value: 'CC BY-NC 4.0', label: 'Creative Commons - Attribution-NonCommercial' },
  { value: 'CC BY-NC-SA 4.0', label: 'Creative Commons - Attribution-NonCommercial-ShareAlike' },
  { value: 'public_domain', label: 'Public Domain' },
  { value: 'copyrighted', label: 'Copyrighted Material (with permission)' }
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Am', 'A#m', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
];

const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8'];

export const ContentSubmissionForm: React.FC<ContentSubmissionFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ContentSubmissionData>({
    title: '',
    description: '',
    content_type: 'song',
    content_data: {},
    license: {
      type: 'original',
      is_original_work: true
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.trim().length < 5) {
        newErrors.title = 'Title must be at least 5 characters long';
      }

      if (!formData.content_type) {
        newErrors.content_type = 'Content type is required';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.trim().length < 20) {
        newErrors.description = 'Description must be at least 20 characters long';
      }
    }

    if (step === 2) {
      if (['song', 'arrangement'].includes(formData.content_type)) {
        if (!formData.content_data.chordpro_content?.trim()) {
          newErrors.chordpro_content = 'ChordPro content is required for songs and arrangements';
        } else if (formData.content_data.chordpro_content.trim().length < 50) {
          newErrors.chordpro_content = 'Content must be at least 50 characters long';
        }
      }
    }

    if (step === 3) {
      if (!formData.license.type) {
        newErrors.license_type = 'License type is required';
      }

      if (formData.license.type === 'copyrighted' && !formData.license.source_url) {
        newErrors.source_url = 'Source URL is required for copyrighted material';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number | boolean | undefined) => {
    if (field.startsWith('content_data.')) {
      const contentField = field.replace('content_data.', '');
      setFormData(prev => ({
        ...prev,
        content_data: {
          ...prev.content_data,
          [contentField]: value
        }
      }));
    } else if (field.startsWith('license.')) {
      const licenseField = field.replace('license.', '');
      setFormData(prev => ({
        ...prev,
        license: {
          ...prev.license,
          [licenseField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleInputChange('content_data.chordpro_content', content);
      };
      reader.readAsText(file);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
        <span className="step-number">1</span>
        <span className="step-label">Basic Info</span>
      </div>
      <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
        <span className="step-number">2</span>
        <span className="step-label">Content</span>
      </div>
      <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
        <span className="step-number">3</span>
        <span className="step-label">Licensing</span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h3>Basic Information</h3>
      
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={errors.title ? 'error' : ''}
          placeholder="Enter a descriptive title for your content"
          maxLength={255}
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="content_type">Content Type *</label>
        <select
          id="content_type"
          value={formData.content_type}
          onChange={(e) => handleInputChange('content_type', e.target.value)}
          className={errors.content_type ? 'error' : ''}
        >
          {CONTENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        {errors.content_type && <span className="error-message">{errors.content_type}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className={errors.description ? 'error' : ''}
          placeholder="Describe your content, what makes it special, and how others can use it"
          rows={4}
          maxLength={1000}
        />
        {errors.description && <span className="error-message">{errors.description}</span>}
        <div className="character-count">{formData.description.length}/1000</div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3>Content Details</h3>

      {['song', 'arrangement'].includes(formData.content_type) && (
        <>
          <div className="form-group">
            <label htmlFor="chordpro_content">ChordPro Content *</label>
            <div className="content-input-header">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="upload-button"
              >
                📁 Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.cho,.crd,.pro"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            <textarea
              id="chordpro_content"
              value={formData.content_data.chordpro_content || ''}
              onChange={(e) => handleInputChange('content_data.chordpro_content', e.target.value)}
              className={`chordpro-editor ${errors.chordpro_content ? 'error' : ''}`}
              placeholder="Enter your ChordPro content here...&#10;&#10;Example:&#10;{title: Song Title}&#10;{artist: Artist Name}&#10;{key: C}&#10;&#10;[C]This is a [F]line with [G]chords [C]above"
              rows={12}
            />
            {errors.chordpro_content && <span className="error-message">{errors.chordpro_content}</span>}
          </div>

          <div className="metadata-grid">
            <div className="form-group">
              <label htmlFor="artist">Artist</label>
              <input
                type="text"
                id="artist"
                value={formData.content_data.artist || ''}
                onChange={(e) => handleInputChange('content_data.artist', e.target.value)}
                placeholder="Artist name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="genre">Genre</label>
              <input
                type="text"
                id="genre"
                value={formData.content_data.genre || ''}
                onChange={(e) => handleInputChange('content_data.genre', e.target.value)}
                placeholder="e.g., Folk, Rock, Classical"
              />
            </div>

            <div className="form-group">
              <label htmlFor="key">Musical Key</label>
              <select
                id="key"
                value={formData.content_data.key || ''}
                onChange={(e) => handleInputChange('content_data.key', e.target.value)}
              >
                <option value="">Select key</option>
                {MUSICAL_KEYS.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tempo">Tempo (BPM)</label>
              <input
                type="number"
                id="tempo"
                min="40"
                max="300"
                value={formData.content_data.tempo || ''}
                onChange={(e) => handleInputChange('content_data.tempo', parseInt(e.target.value) || undefined)}
                placeholder="120"
              />
            </div>

            <div className="form-group">
              <label htmlFor="time_signature">Time Signature</label>
              <select
                id="time_signature"
                value={formData.content_data.time_signature || ''}
                onChange={(e) => handleInputChange('content_data.time_signature', e.target.value)}
              >
                <option value="">Select time signature</option>
                {TIME_SIGNATURES.map(sig => (
                  <option key={sig} value={sig}>{sig}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={formData.content_data.difficulty || ''}
                onChange={(e) => handleInputChange('content_data.difficulty', e.target.value)}
              >
                <option value="">Select difficulty</option>
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {formData.content_type === 'tutorial' && (
        <div className="form-group">
          <label htmlFor="tutorial_content">Tutorial Content *</label>
          <textarea
            id="tutorial_content"
            value={formData.content_data.tutorial_content || ''}
            onChange={(e) => handleInputChange('content_data.tutorial_content', e.target.value)}
            placeholder="Write your tutorial content here. Include step-by-step instructions, tips, and any relevant musical examples."
            rows={10}
          />
        </div>
      )}

      {formData.content_type === 'exercise' && (
        <div className="form-group">
          <label htmlFor="exercise_content">Exercise Instructions *</label>
          <textarea
            id="exercise_content"
            value={formData.content_data.exercise_content || ''}
            onChange={(e) => handleInputChange('content_data.exercise_content', e.target.value)}
            placeholder="Describe the practice exercise, including goals, techniques, and repetition guidelines."
            rows={8}
          />
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h3>Licensing & Copyright</h3>

      <div className="form-group">
        <label htmlFor="license_type">License Type *</label>
        <select
          id="license_type"
          value={formData.license.type}
          onChange={(e) => handleInputChange('license.type', e.target.value)}
          className={errors.license_type ? 'error' : ''}
        >
          {LICENSE_TYPES.map(license => (
            <option key={license.value} value={license.value}>{license.label}</option>
          ))}
        </select>
        {errors.license_type && <span className="error-message">{errors.license_type}</span>}
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.license.is_original_work}
            onChange={(e) => handleInputChange('license.is_original_work', e.target.checked)}
          />
          This is my original work
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="copyright_holder">Copyright Holder</label>
        <input
          type="text"
          id="copyright_holder"
          value={formData.license.copyright_holder || ''}
          onChange={(e) => handleInputChange('license.copyright_holder', e.target.value)}
          placeholder="Your name or organization"
        />
      </div>

      {formData.license.type.startsWith('CC') && (
        <div className="form-group">
          <label htmlFor="attribution_text">Attribution Text</label>
          <input
            type="text"
            id="attribution_text"
            value={formData.license.attribution_text || ''}
            onChange={(e) => handleInputChange('license.attribution_text', e.target.value)}
            placeholder="How you'd like to be credited"
          />
        </div>
      )}

      {!formData.license.is_original_work && (
        <>
          <div className="form-group">
            <label htmlFor="source_url">Source URL {formData.license.type === 'copyrighted' ? '*' : ''}</label>
            <input
              type="url"
              id="source_url"
              value={formData.license.source_url || ''}
              onChange={(e) => handleInputChange('license.source_url', e.target.value)}
              className={errors.source_url ? 'error' : ''}
              placeholder="https://example.com/original-source"
            />
            {errors.source_url && <span className="error-message">{errors.source_url}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="source_notes">Source Notes</label>
            <textarea
              id="source_notes"
              value={formData.license.source_notes || ''}
              onChange={(e) => handleInputChange('license.source_notes', e.target.value)}
              placeholder="Additional information about the source, permissions obtained, etc."
              rows={3}
            />
          </div>
        </>
      )}

      <div className="license-info">
        <h4>License Information</h4>
        {formData.license.type === 'original' && (
          <p>Your content will be protected under copyright law. Others will need your permission to use it.</p>
        )}
        {formData.license.type.startsWith('CC') && (
          <p>Your content will be available under Creative Commons license, allowing others to use it with proper attribution.</p>
        )}
        {formData.license.type === 'public_domain' && (
          <p>Your content will be released to the public domain, allowing unrestricted use by anyone.</p>
        )}
        {formData.license.type === 'copyrighted' && (
          <p>Please ensure you have proper permission to share this copyrighted material.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="content-submission-form">
      <div className="form-header">
        <h2>Submit Content to Community</h2>
        <p>Share your musical creations with the ChordMe community</p>
      </div>

      {renderStepIndicator()}

      <form onSubmit={handleSubmit} className="submission-form">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        <div className="form-actions">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Previous
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="btn btn-cancel"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Content'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ContentSubmissionForm;