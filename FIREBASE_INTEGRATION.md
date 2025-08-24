# Firebase Integration Setup Guide

ChordMe now supports Firebase and Firestore as an alternative backend for scalable, real-time data storage. This guide explains how to set up and configure Firebase integration.

## Overview

The Firebase integration provides:
- **Firestore**: Real-time NoSQL database for songs and user data
- **Scalability**: Auto-scaling cloud database
- **Real-time updates**: Live data synchronization (ready for future features)
- **Offline support**: Built-in offline capabilities
- **Security**: Firebase security rules for data protection

## Configuration Options

ChordMe supports two data source modes:
1. **Flask Backend** (default): Uses the existing Python Flask API
2. **Firebase/Firestore**: Uses Firebase cloud services

The data source is controlled by the `VITE_DATA_SOURCE` environment variable.

## Firebase Project Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "chordme-app")
4. Choose whether to enable Google Analytics (optional)
5. Create the project

### 2. Enable Firestore Database

1. In your Firebase project console, navigate to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (or configure security rules)
4. Select a location for your database
5. Click "Done"

### 3. Get Firebase Configuration

1. In your Firebase project console, click the gear icon and select "Project settings"
2. Scroll down to the "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register your app with a nickname (e.g., "ChordMe Web")
5. Copy the Firebase configuration object

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.template .env
```

### 2. Configure Firebase Variables

Add your Firebase configuration to the `.env` file:

```bash
# Firebase Configuration for Frontend
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Set data source to use Firebase
VITE_DATA_SOURCE=firebase
```

### 3. Example Configuration

```bash
# Firebase Configuration for Frontend
VITE_FIREBASE_API_KEY=AIzaSyC123...example
VITE_FIREBASE_AUTH_DOMAIN=chordme-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chordme-app
VITE_FIREBASE_STORAGE_BUCKET=chordme-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456

# Data Source Configuration
VITE_DATA_SOURCE=firebase
```

## Firestore Database Structure

When using Firebase, the application creates the following collections:

### Users Collection (`/users/{userId}`)
```json
{
  "email": "user@example.com",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Songs Collection (`/songs/{songId}`)
```json
{
  "title": "Song Title",
  "author_id": "user-id",
  "content": "ChordPro format content",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

## Firestore Security Rules

For production, configure Firestore security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access songs they own
    match /songs/{songId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.author_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.author_id;
    }
  }
}
```

## Development Setup

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install
```

### 2. Configure Environment

Set up your `.env` file as described above.

### 3. Start Development Servers

```bash
# Start frontend (Firebase mode)
npm run dev:frontend

# Optional: Start Flask backend (for fallback)
npm run dev:backend
```

## Testing Firebase Integration

### 1. Run Tests

```bash
npm run test:all
```

### 2. Manual Testing

1. Navigate to `http://localhost:5173`
2. Register a new user account
3. Create, edit, and delete songs
4. Verify data persists in Firebase Console

## Switching Between Data Sources

### Use Flask Backend (Default)
```bash
VITE_DATA_SOURCE=api
# or remove the variable entirely
```

### Use Firebase/Firestore
```bash
VITE_DATA_SOURCE=firebase
# Plus all Firebase configuration variables
```

## Production Deployment

### 1. Firebase Configuration

For production deployment:
1. Use production Firebase project
2. Configure proper Firestore security rules
3. Set up Firebase Authentication (if needed)
4. Configure environment variables in your hosting platform

### 2. Environment Variables

Make sure to set all Firebase environment variables in your production environment:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_DATA_SOURCE=firebase`

## Troubleshooting

### Firebase Not Initializing

Check that all required environment variables are set:
```bash
echo $VITE_FIREBASE_API_KEY
echo $VITE_FIREBASE_PROJECT_ID
echo $VITE_DATA_SOURCE
```

### Permission Denied Errors

1. Verify Firestore security rules allow your operations
2. Check if Firebase Authentication is properly configured
3. Ensure user authentication is working

### Data Not Syncing

1. Check browser developer console for errors
2. Verify Firestore rules allow read/write operations
3. Check network connectivity to Firebase

### Fallback to Flask Backend

If Firebase is misconfigured, the app will fall back to the Flask backend. Check console logs for Firebase initialization messages.

## Features Available

### Current Features
- ✅ Song CRUD operations (Create, Read, Update, Delete)
- ✅ User data storage
- ✅ Automatic data source switching
- ✅ Error handling and fallback
- ✅ Type-safe TypeScript integration

### Future Enhancements
- 🔄 Real-time collaboration on songs
- 🔄 Firebase Authentication integration
- 🔄 Cloud Functions for advanced features
- 🔄 File storage for audio/images
- 🔄 Offline-first capabilities

## Support

For issues with Firebase integration:
1. Check the browser console for error messages
2. Verify Firebase project configuration
3. Review Firestore security rules
4. Test with both development and production Firebase projects