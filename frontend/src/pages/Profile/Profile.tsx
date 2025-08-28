import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { validateEmail, validateRequired } from '../../utils';
import PasswordInput from '../../components/PasswordInput';
import type { User } from '../../types';
import './Profile.css';

interface ProfileFormData {
  display_name: string;
  bio: string;
  profile_image_url: string;
}

interface EmailFormData {
  new_email: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const Profile: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, updateUserProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    display_name: '',
    bio: '',
    profile_image_url: '',
  });
  
  // Email form state
  const [emailData, setEmailData] = useState<EmailFormData>({
    new_email: '',
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  const [errors, setErrors] = useState<{
    profile?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // Initialize profile data when user data is available
  useEffect(() => {
    if (user) {
      setProfileData({
        display_name: user.display_name || '',
        bio: user.bio || '',
        profile_image_url: user.profile_image_url || '',
      });
      setEmailData({
        new_email: user.email || '',
      });
    }
  }, [user]);

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage('');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const response = await apiService.updateUserProfile(profileData);
      if (response.success && response.data) {
        updateUserProfile(response.data);
        setSuccessMessage(t('profile.profileUpdated'));
      }
    } catch (error: any) {
      setErrors({ profile: error.message || t('profile.updateError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    // Validate email
    if (!validateEmail(emailData.new_email)) {
      setErrors({ email: t('validation.invalidEmail') });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiService.updateUserEmail(emailData);
      if (response.success && response.data) {
        updateUserProfile(response.data);
        setSuccessMessage(t('profile.emailUpdated'));
      }
    } catch (error: any) {
      setErrors({ email: error.message || t('profile.emailUpdateError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    // Validate passwords
    if (!validateRequired(passwordData.current_password)) {
      setErrors({ password: t('validation.currentPasswordRequired') });
      return;
    }
    
    if (!validateRequired(passwordData.new_password)) {
      setErrors({ password: t('validation.newPasswordRequired') });
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors({ password: t('validation.passwordMismatch') });
      return;
    }

    setIsLoading(true);

    try {
      await apiService.updateUserPassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      
      setSuccessMessage(t('profile.passwordUpdated'));
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      setErrors({ password: error.message || t('profile.passwordUpdateError') });
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (profileData.profile_image_url) {
      return profileData.profile_image_url;
    }
    // Default avatar - neutral, non-gendered
    return '/default-avatar.svg';
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">{t('profile.title')}</h1>
        
        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}
        
        {errors.general && (
          <div className="alert alert-error" role="alert">
            {errors.general}
          </div>
        )}

        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            {t('profile.profileTab')}
          </button>
          <button
            className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            {t('profile.accountTab')}
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2>{t('profile.profileInformation')}</h2>
            
            <div className="profile-avatar-section">
              <div className="avatar-container">
                <img
                  src={getAvatarUrl()}
                  alt={t('profile.profilePicture')}
                  className="profile-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.svg';
                  }}
                />
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="display_name" className="form-label">
                  {t('profile.displayName')}
                </label>
                <input
                  type="text"
                  id="display_name"
                  className="form-input"
                  value={profileData.display_name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, display_name: e.target.value })
                  }
                  maxLength={100}
                  placeholder={t('profile.displayNamePlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio" className="form-label">
                  {t('profile.bio')}
                </label>
                <textarea
                  id="bio"
                  className="form-textarea"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  maxLength={500}
                  rows={4}
                  placeholder={t('profile.bioPlaceholder')}
                />
                <div className="character-count">
                  {profileData.bio.length}/500
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="profile_image_url" className="form-label">
                  {t('profile.profileImageUrl')}
                </label>
                <input
                  type="url"
                  id="profile_image_url"
                  className="form-input"
                  value={profileData.profile_image_url}
                  onChange={(e) =>
                    setProfileData({ ...profileData, profile_image_url: e.target.value })
                  }
                  maxLength={500}
                  placeholder={t('profile.profileImageUrlPlaceholder')}
                />
              </div>

              {errors.profile && (
                <div className="alert alert-error" role="alert">
                  {errors.profile}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? t('common.saving') : t('profile.updateProfile')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="tab-content">
            <h2>{t('profile.accountSettings')}</h2>
            
            {/* Email Update Section */}
            <div className="account-section">
              <h3>{t('profile.updateEmail')}</h3>
              <form onSubmit={handleEmailSubmit} className="account-form">
                <div className="form-group">
                  <label htmlFor="new_email" className="form-label">
                    {t('profile.newEmail')}
                  </label>
                  <input
                    type="email"
                    id="new_email"
                    className="form-input"
                    value={emailData.new_email}
                    onChange={(e) =>
                      setEmailData({ ...emailData, new_email: e.target.value })
                    }
                    required
                  />
                </div>

                {errors.email && (
                  <div className="alert alert-error" role="alert">
                    {errors.email}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.saving') : t('profile.updateEmail')}
                </button>
              </form>
            </div>

            {/* Password Update Section */}
            <div className="account-section">
              <h3>{t('profile.changePassword')}</h3>
              <form onSubmit={handlePasswordSubmit} className="account-form">
                <div className="form-group">
                  <label htmlFor="current_password" className="form-label">
                    {t('profile.currentPassword')}
                  </label>
                  <PasswordInput
                    id="current_password"
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, current_password: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new_password" className="form-label">
                    {t('profile.newPassword')}
                  </label>
                  <PasswordInput
                    id="new_password"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_password" className="form-label">
                    {t('profile.confirmPassword')}
                  </label>
                  <PasswordInput
                    id="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                    required
                  />
                </div>

                {errors.password && (
                  <div className="alert alert-error" role="alert">
                    {errors.password}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.saving') : t('profile.changePassword')}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;