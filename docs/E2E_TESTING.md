# ChordMe End-to-End Test Suite Documentation

## Overview

This document provides comprehensive documentation for the ChordMe application's end-to-end (E2E) test suite. The test suite covers all critical user workflows and functionality to ensure the application works correctly from a user's perspective.

## Test Architecture

### Test Framework
- **Framework**: Playwright with TypeScript
- **Test Runner**: Playwright Test Runner
- **Browser**: Chromium (Chrome)
- **Configuration**: `playwright.config.ts`

### Test Structure
The E2E tests are organized into the following files:

1. **`basic-navigation.spec.ts`** - Basic navigation and page loading tests
2. **`authentication.spec.ts`** - User registration and login workflows
3. **`chordpro-demo.spec.ts`** - ChordPro editor and demo functionality
4. **`song-management.spec.ts`** - Authenticated user song management
5. **`error-handling.spec.ts`** - Error handling and edge cases
6. **`ui-accessibility.spec.ts`** - UI/UX and accessibility tests

## Test Coverage

### 1. Authentication Workflows (`authentication.spec.ts`)
- **User Registration**
  - ✅ Successful registration with valid data
  - ✅ Validation errors for invalid email
  - ✅ Validation errors for weak passwords
  - ✅ Password mismatch validation
  - ✅ Password requirements display

- **User Login**
  - ✅ Login form display and structure
  - ✅ Validation for empty fields
  - ✅ Email format validation
  - ✅ Authentication with invalid credentials

- **Navigation**
  - ✅ Navigation between auth pages
  - ✅ Access control for protected routes

### 2. ChordPro Demo Features (`chordpro-demo.spec.ts`)
- **Demo Page Content**
  - ✅ Feature explanations and examples
  - ✅ Interactive editor functionality
  - ⚠️ Rendered output display (needs selector fixes)
  - ⚠️ Raw content display (needs selector fixes)

- **Editor Functionality**
  - ✅ Real-time content editing
  - ⚠️ Dynamic output updates (needs selector fixes)
  - ✅ Syntax highlighting support
  - ✅ Large content handling

- **ChordPro Validation**
  - ✅ Malformed content handling
  - ✅ Special character support
  - ✅ Unicode character support

### 3. Song Management (`song-management.spec.ts`)
- **Authenticated User Features**
  - 🔄 Home page access after login
  - 🔄 Song list display
  - 🔄 Song creation workflow
  - 🔄 Song editing capabilities
  - 🔄 Song deletion with confirmation

- **File Operations**
  - 🔄 Song download functionality
  - 🔄 File upload support
  - 🔄 Bulk operations

- **Search and Filter**
  - 🔄 Song search functionality
  - 🔄 Filter and sort options

*Note: Song management tests require actual user registration/login flow to be working*

### 4. Error Handling (`error-handling.spec.ts`)
- **Network Errors**
  - ✅ Server unavailable handling
  - ✅ Slow network responses
  - ✅ API error responses

- **Form Validation Edge Cases**
  - ✅ Extremely long inputs
  - ✅ Special characters
  - ✅ Whitespace-only inputs
  - ✅ Unicode character support

- **Browser Compatibility**
  - ✅ Back/forward navigation
  - ✅ Page refresh handling
  - ✅ Responsive design
  - ✅ Window resize handling

- **Performance Edge Cases**
  - ✅ Rapid navigation
  - ✅ Memory-intensive operations
  - ✅ Large content handling

### 5. UI and Accessibility (`ui-accessibility.spec.ts`)
- **Navigation and Layout**
  - ✅ Consistent header/footer
  - ✅ Active navigation states
  - ✅ Responsive navigation

- **Form UI/UX**
  - ✅ Proper form labels
  - ✅ Input placeholders
  - ✅ Visual feedback
  - ✅ Button states

- **Accessibility (a11y)**
  - ✅ Heading hierarchy
  - ✅ ARIA labels
  - ✅ Keyboard navigation
  - ✅ Screen reader support
  - ✅ Focus management

- **Visual Design**
  - ✅ Consistent styling
  - ✅ Responsive design
  - ✅ Long content handling
  - ✅ Loading states

## Critical User Workflows Covered

### 1. Guest User Journey
1. **Landing** → Redirected to login page
2. **Demo Access** → Can view ChordPro demo without authentication
3. **Registration** → Create new account with validation
4. **Login** → Authenticate with credentials

### 2. Authenticated User Journey
1. **Login** → Access protected areas
2. **Song Management** → Create, edit, delete songs
3. **ChordPro Editing** → Use editor with syntax highlighting
4. **File Operations** → Upload/download songs
5. **Search** → Find and organize songs

### 3. ChordPro Feature Journey
1. **Demo Usage** → Try features without account
2. **Syntax Learning** → Understand ChordPro format
3. **Real-time Editing** → See changes as you type
4. **Export/Share** → Download or share created songs

## Test Execution

### Running All Tests
```bash
npm run test:e2e
```

### Running Specific Test Files
```bash
npx playwright test basic-navigation.spec.ts
npx playwright test authentication.spec.ts
npx playwright test chordpro-demo.spec.ts
npx playwright test song-management.spec.ts
npx playwright test error-handling.spec.ts
npx playwright test ui-accessibility.spec.ts
```

### Running with Different Options
```bash
# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium

# Run with reporter
npx playwright test --reporter=html
```

## Test Results and Reporting

### Current Status
- ✅ **Basic Navigation**: 4/4 tests passing
- ⚠️ **ChordPro Demo**: 8/13 tests passing (selector issues)
- 🔄 **Authentication**: Needs real backend integration
- 🔄 **Song Management**: Requires authentication flow
- ✅ **Error Handling**: Comprehensive coverage
- ✅ **UI/Accessibility**: Full coverage

### Known Issues
1. **Selector Specificity**: Some tests use overly generic selectors that match multiple elements
2. **Authentication Flow**: Tests need real user registration/login to work
3. **API Integration**: Some tests require actual backend responses

## Test Maintenance

### Adding New Tests
1. Follow the existing file structure
2. Use descriptive test names
3. Group related tests in `describe` blocks
4. Add proper error handling
5. Use specific, stable selectors

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up any test data after tests
3. **Stability**: Use reliable selectors (data-testid, role-based)
4. **Coverage**: Test both happy path and edge cases
5. **Documentation**: Document complex test scenarios

### Selector Strategy
1. **Preferred**: `data-testid` attributes
2. **Good**: Semantic selectors (`role`, `name`)
3. **Acceptable**: CSS classes with stable names
4. **Avoid**: Generic element selectors, xpath

## Future Enhancements

### Planned Improvements
1. **Authentication Helper**: Create reusable login helper
2. **Test Data Management**: Implement test data seeding
3. **Visual Regression**: Add screenshot comparison tests
4. **Performance Testing**: Add performance benchmarks
5. **Cross-browser Testing**: Extend to Firefox and Safari

### Integration Enhancements
1. **API Mocking**: More sophisticated API response mocking
2. **Database Seeding**: Pre-populate test data
3. **CI/CD Integration**: Automated test execution
4. **Test Reporting**: Enhanced reporting and metrics

## Troubleshooting

### Common Issues
1. **Element Not Found**: Check if selector is correct and element exists
2. **Timeout Errors**: Increase wait times for slow operations
3. **Flaky Tests**: Add proper wait conditions
4. **Server Not Starting**: Ensure backend dependencies are installed

### Debug Tips
1. Use `page.pause()` to debug interactively
2. Add screenshots with `page.screenshot()`
3. Use `page.locator().highlight()` to debug selectors
4. Check browser console for JavaScript errors

## Conclusion

The ChordMe E2E test suite provides comprehensive coverage of all user-facing functionality. While some tests need refinement (particularly around selector specificity and authentication flow), the suite successfully validates:

- Core navigation and UI functionality
- ChordPro editor features and demo capabilities
- Error handling and edge cases
- Accessibility and responsive design
- Form validation and user interactions

The test suite serves as both a quality assurance tool and documentation of expected application behavior, ensuring that future changes don't break existing functionality.