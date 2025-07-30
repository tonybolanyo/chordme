# ChordMe E2E Tests

This directory contains comprehensive end-to-end tests for the ChordMe application, covering all critical user workflows and functionality.

## Quick Start

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test basic-navigation.spec.ts

# Run with UI mode for debugging
npx playwright test --ui
```

## Test Files Overview

### 🚀 `basic-navigation.spec.ts` 
**Status**: ✅ All tests passing (4/4)
- Page loading and navigation
- Route handling and redirects  
- Basic UI element visibility

### 🔐 `authentication.spec.ts`
**Status**: 🔄 Ready for integration (15 tests)
- User registration with validation
- Login process and error handling
- Password requirements and security
- Navigation between auth pages

### 🎵 `chordpro-demo.spec.ts`
**Status**: ⚠️ Partially working (8/13 passing)
- Interactive ChordPro editor functionality
- Real-time content rendering  
- Syntax highlighting and validation
- Large content and special character handling
- *Note: Some selector issues need fixing*

### 📝 `song-management.spec.ts`
**Status**: 🔄 Ready for integration (12 tests)
- Song CRUD operations (Create, Read, Update, Delete)
- File upload and download functionality
- Search and filtering capabilities
- Authenticated user workflows

### ⚠️ `error-handling.spec.ts`
**Status**: ✅ Ready (18 tests)
- Network error simulation and handling
- Form validation edge cases
- Browser compatibility testing
- Performance under load scenarios

### ♿ `ui-accessibility.spec.ts`  
**Status**: ✅ Ready (15 tests)
- Accessibility compliance (WCAG)
- Keyboard navigation support
- Responsive design validation
- Screen reader compatibility

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Categories
```bash
# Navigation tests
npx playwright test basic-navigation.spec.ts

# Authentication workflows  
npx playwright test authentication.spec.ts

# ChordPro functionality
npx playwright test chordpro-demo.spec.ts

# Song management
npx playwright test song-management.spec.ts

# Error scenarios
npx playwright test error-handling.spec.ts

# UI and accessibility
npx playwright test ui-accessibility.spec.ts
```

### Debug Mode
```bash
# Interactive debugging
npx playwright test --debug

# With browser UI visible
npx playwright test --headed

# Generate test report
npx playwright test --reporter=html
```

## Test Configuration

Tests are configured via `playwright.config.ts`:
- **Base URL**: `http://localhost:5173` (frontend)
- **Backend**: `http://localhost:5000` (backend)  
- **Browser**: Chromium
- **Automatic server startup**: Frontend and backend servers start automatically

## Critical Workflows Covered

### 1. Guest User Journey
1. **Landing** → Redirect to login
2. **Demo Access** → ChordPro demo without auth
3. **Registration** → Account creation with validation
4. **Login** → Authentication process

### 2. Authenticated User Journey  
1. **Login** → Access protected areas
2. **Song Management** → CRUD operations
3. **ChordPro Editing** → Interactive editor
4. **File Operations** → Upload/download
5. **Search** → Find and organize songs

### 3. Error Handling Journey
1. **Network Issues** → Graceful degradation
2. **Invalid Inputs** → Clear error messages
3. **Edge Cases** → Robust handling
4. **Recovery** → User can continue after errors

## Test Quality Features

### 🛡️ Robust Testing
- **Network mocking** for API testing
- **Error simulation** for edge cases  
- **Performance testing** with large datasets
- **Cross-device validation** (mobile/tablet/desktop)

### ♿ Accessibility Focus
- **Keyboard navigation** testing
- **Screen reader** compatibility
- **ARIA labels** validation
- **Color contrast** verification

### 🔧 Developer Experience
- **Descriptive test names** for clarity
- **Helper functions** for common operations
- **Page object patterns** for maintainability  
- **Comprehensive documentation**

## Troubleshooting

### Common Issues

**Tests failing with "Element not found":**
- Check if selectors are correct and specific enough
- Ensure the application is running on correct ports
- Verify element exists in current application state

**Server startup failures:**
- Ensure backend dependencies are installed (`pip install -r requirements.txt`)
- Ensure frontend dependencies are installed (`npm install` in frontend/)
- Check if ports 5000 and 5173 are available

**Timeout errors:**
- Increase timeout in test configuration if needed
- Check for slow network conditions
- Verify application performance

### Debug Tips

```javascript
// Add to tests for debugging
await page.pause(); // Interactive debugging
await page.screenshot({ path: 'debug.png' }); // Screenshot
console.log(await page.locator('selector').textContent()); // Element content
```

## Contributing

### Adding New Tests
1. Choose appropriate test file based on functionality
2. Follow existing patterns and naming conventions
3. Use semantic selectors (role-based, data-testid)
4. Add both positive and negative test cases
5. Include proper error handling

### Best Practices
- **Independent tests**: Each test should work in isolation
- **Descriptive names**: Test names should clearly describe what is being tested
- **Stable selectors**: Use reliable element selectors  
- **Proper waits**: Use explicit waits instead of arbitrary timeouts
- **Clean up**: Ensure tests don't leave residual state

## Documentation

- **[E2E_TESTING.md](../docs/E2E_TESTING.md)**: Comprehensive test documentation
- **[E2E_TEST_REPORT.md](../docs/E2E_TEST_REPORT.md)**: Detailed test coverage report
- **[TESTING.md](../TESTING.md)**: Overall testing strategy

## Current Status

✅ **Ready for Production**: 37 tests ready  
⚠️ **Needs Refinement**: 5 tests (selector issues)  
🔄 **Integration Needed**: 35 tests (require backend)

**Total Test Coverage**: 77 test cases across all critical user workflows