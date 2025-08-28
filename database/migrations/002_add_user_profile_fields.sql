-- ChordMe Database Migration Script
-- Version: 002_add_user_profile_fields
-- Description: Add profile fields to users table for user profile management

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(500);