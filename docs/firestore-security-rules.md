---
layout: default
lang: en
title: Firestore Security Rules
---

# Firestore Security Rules - Implementation Guide

This document describes the comprehensive Firestore security rules implemented for ChordMe and provides instructions for deployment and testing.

## Overview

The security rules enforce strict authentication and authorization controls to ensure users can only access their own data and prevent unauthorized access to sensitive information.

## Security Rules Features

### Authentication Requirements
- All operations require user authentication (`request.auth != null`)
- Unauthenticated users are denied access to all collections
- Uses Firebase Authentication UIDs for user identification

### User Data Protection
- **Users Collection (`/users/{userId}`)**: Users can only access their own user document
- **Songs Collection (`/songs/{songId}`)**: Users can only access songs they authored
- **Chords Collection (`/chords/{chordId}`)**: Users can only access chords they created

### Data Validation
- **Email Validation**: Proper email format and length limits (120 characters)
- **String Validation**: Length limits for all text fields
- **Timestamp Validation**: Ensures proper timestamp format
- **Required Fields**: Validates all required fields are present

### Ownership Protection
- Prevents users from changing ownership of documents
- Prevents modification of creation timestamps
- Enforces author/owner validation on all operations

### Future Sharing Support
- Prepared infrastructure for sharing songs between users
- Sharing subcollection with proper permission validation
- Granular permissions (read, write) for shared access

## File Structure

```
/
├── firestore.rules           # Main security rules file
├── firebase.json            # Firebase project configuration
├── firestore.indexes.json  # Database indexes for performance
└── frontend/src/test/
    ├── firestore-security-rules.test.ts       # Comprehensive security tests (requires emulator)
    └── firestore-security-validation.test.ts  # Structure validation tests
```

## Security Rules Details

### Helper Functions

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function isValidEmail(email) {
  return email is string && 
         email.matches('.*@.*\\..*') && 
         email.size() <= 120;
}
```

### Collection Rules

#### Users Collection
- **Read/Write**: Users can only access their own user document
- **Validation**: Email format, required fields, timestamp validation
- **Protection**: Cannot change creation time on updates

#### Songs Collection
- **Read**: Users can read songs they authored (future: + shared songs)
- **Create**: Users can only create songs where they are the author
- **Update**: Users can only update their own songs, cannot change ownership
- **Delete**: Users can only delete their own songs
- **Validation**: Title (≤200 chars), content (≤50,000 chars), timestamps

#### Chords Collection
- **Read/Write**: Users can only access chords they own
- **Validation**: Name (≤50 chars), definition (≤1,000 chars), optional description
- **Protection**: Cannot change ownership or creation time

#### Sharing Subcollection (Future Feature)
- **Path**: `/songs/{songId}/shared/{shareId}`
- **Permissions**: Owner can create/update/delete, shared users can read/delete their own shares
- **Validation**: User ID, permissions array, creation timestamp

## Testing

### Running Security Rules Tests

#### 1. Structure Validation Tests (Always Available)
```bash
cd frontend
npm test -- --run firestore-security-validation.test.ts
```

These tests validate:
- Rules file structure and syntax
- Required collections and validation functions
- Configuration files presence
- Security boundaries

#### 2. Comprehensive Security Tests (Requires Emulator)

**Prerequisites:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Start emulator: `firebase emulators:start --only firestore`

**Run tests:**
```bash
cd frontend
npm test -- --run firestore-security-rules.test.ts
```

These tests validate:
- Authentication requirements
- User isolation (users cannot access other users' data)
- Data validation and structure enforcement
- Permission boundaries
- Edge cases and security violations

### Test Coverage

The security tests cover:
- ✅ 28 comprehensive security test cases
- ✅ 15 structure validation tests
- ✅ Authentication and authorization scenarios
- ✅ Data validation rules
- ✅ Ownership protection
- ✅ Future sharing mechanisms
- ✅ Security boundary testing

## Deployment

### 1. Deploy Security Rules

```bash
# Deploy rules to Firebase project
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy both
firebase deploy --only firestore
```

### 2. Verify Deployment

```bash
# Check rules in Firebase Console
firebase open firestore

# Test rules with emulator
firebase emulators:start --only firestore
```

### 3. Environment Configuration

Ensure your `.env` file includes:
```bash
VITE_DATA_SOURCE=firebase
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase configuration
```

## Security Best Practices Implemented

### 1. Defense in Depth
- Multiple validation layers
- Authentication + authorization checks
- Field-level validation

### 2. Principle of Least Privilege
- Users can only access their own data
- Specific permissions for each operation
- No broad access rules

### 3. Data Integrity
- Prevents ownership changes
- Validates data structure
- Enforces required fields

### 4. Future-Proof Design
- Sharing infrastructure ready for implementation
- Extensible permission system
- Granular access controls

## Troubleshooting

### Common Issues

1. **Rules not taking effect**
   - Wait up to 10 seconds for rule deployment
   - Check Firebase Console for deployment status
   - Verify project ID in configuration

2. **Permission denied errors**
   - Ensure user is authenticated
   - Check document ownership
   - Validate data structure matches rules

3. **Test failures**
   - Ensure Firebase emulator is running on port 8080
   - Check rules file path in tests
   - Verify Firebase CLI is installed

### Debugging

```bash
# Check rules syntax
firebase deploy --only firestore:rules --dry-run

# View deployed rules
firebase firestore:rules get

# Monitor rule evaluation
# (Enable in Firebase Console > Firestore > Rules > Playground)
```

## Performance Considerations

### Indexes
- Optimized indexes for common queries
- Compound indexes for multi-field queries
- Automatic single-field indexes

### Rule Evaluation
- Helper functions minimize code duplication
- Efficient authentication checks
- Optimized validation functions

## Security Review Checklist

- [x] All operations require authentication
- [x] Users cannot access other users' data
- [x] Data validation prevents malicious input
- [x] Ownership cannot be changed by non-owners
- [x] Creation timestamps are immutable
- [x] Field length limits prevent DoS attacks
- [x] Email validation prevents invalid data
- [x] Sharing mechanism is secure and permission-based
- [x] Catch-all rule denies access to undefined collections
- [x] Comprehensive test coverage validates all security aspects

## Future Enhancements

1. **Song Sharing Implementation**
   - Activate `isSharedWithUser()` function
   - Add sharing UI components
   - Implement notification system

2. **Advanced Permissions**
   - Read-only vs. read-write sharing
   - Temporary access (expiration dates)
   - Group-based permissions

3. **Audit Logging**
   - Track access attempts
   - Log security violations
   - Monitor unusual activity patterns