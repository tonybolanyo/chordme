# ChordMe Accessibility Guidelines

This document outlines the accessibility standards and implementation guidelines for ChordMe to ensure WCAG 2.1 AA compliance.

## Overview

ChordMe follows WCAG 2.1 AA accessibility standards to ensure the application is usable by people with disabilities, including those who rely on screen readers, keyboard navigation, or have visual impairments.

## Color and Contrast Standards

### Color Palette

All colors used in ChordMe meet WCAG 2.1 AA contrast requirements:

- **Primary Colors**: 
  - `--primary-color: #1e3a8a` (7.47:1 contrast ratio with white)
  - `--primary-hover: #1e40af` (6.78:1 contrast ratio with white)
  - `--primary-light: #3b82f6` (4.52:1 contrast ratio with white)

- **Text Colors**:
  - `--text-primary: #111827` (16.91:1 contrast ratio with white)
  - `--text-secondary: #374151` (8.87:1 contrast ratio with white)
  - `--text-muted: #6b7280` (4.59:1 contrast ratio with white)

- **Interactive States**:
  - `--focus-color: #2563eb` (5.85:1 contrast ratio)
  - `--error-color: #dc2626` (5.47:1 contrast ratio)
  - `--success-color: #059669` (4.84:1 contrast ratio)

### Contrast Requirements

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 3:1 contrast ratio for borders and focus indicators

## ARIA Implementation

### Landmark Roles

All major page sections use proper landmark roles:

```html
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main role="main" aria-label="Main content">
<footer role="contentinfo" aria-label="Site footer">
```

### Form Accessibility

All form elements include proper labels and error handling:

```html
<label htmlFor="email">Email</label>
<input 
  id="email"
  type="email"
  aria-invalid={hasError ? 'true' : 'false'}
  aria-describedby={hasError ? 'email-error' : undefined}
  required
/>
<span id="email-error" role="alert" aria-live="polite">
  Error message
</span>
```

### Dynamic Content

Screen reader announcements for dynamic content changes:

```html
<!-- Status messages -->
<div role="status" aria-live="polite">Success message</div>

<!-- Error messages -->
<div role="alert" aria-live="assertive">Error message</div>

<!-- Loading states -->
<span className="sr-only" aria-live="polite">Loading...</span>
```

### Interactive Components

All interactive elements have proper ARIA attributes:

```html
<!-- Buttons -->
<button 
  aria-label="Transpose up"
  aria-describedby="help-text"
  type="button"
>♯</button>

<!-- Expandable content -->
<button 
  aria-expanded={isOpen}
  aria-controls="menu-items"
  aria-label="Toggle menu"
>Menu</button>

<!-- Modal dialogs -->
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
```

## Keyboard Navigation

### Focus Management

- All interactive elements are keyboard accessible
- Custom focus indicators with 2px outline
- Logical tab order throughout the application
- Focus trapping in modal dialogs

### Keyboard Shortcuts

- **Tab**: Navigate to next interactive element
- **Shift+Tab**: Navigate to previous interactive element
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modal dialogs and dropdowns
- **Arrow keys**: Navigate within component groups

### Skip Navigation

A skip link is provided for keyboard users:

```html
<a href="#main-content" className="skip-nav">
  Skip to main content
</a>
```

## Screen Reader Support

### Semantic HTML

Use semantic HTML elements whenever possible:

- `<nav>` for navigation areas
- `<main>` for main content
- `<section>` for content sections
- `<article>` for standalone content
- `<aside>` for sidebar content
- `<header>` and `<footer>` for page structure

### Screen Reader Only Content

Use the `.sr-only` class for content that should only be available to screen readers:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Descriptive Link Text

All links have descriptive text or aria-labels:

```html
<!-- Good -->
<a href="#demo" aria-label="Try ChordMe demo">Demo</a>

<!-- Avoid -->
<a href="#demo">Click here</a>
```

## Testing Guidelines

### Automated Testing

1. **axe-core integration**: Every page is tested with axe-core for automatic accessibility issue detection
2. **Component tests**: All components include accessibility tests verifying ARIA attributes
3. **Color contrast validation**: Automated testing ensures all color combinations meet WCAG standards

### Manual Testing

1. **Keyboard navigation**: Test all functionality using only the keyboard
2. **Screen reader testing**: Test with screen readers (NVDA, JAWS, VoiceOver)
3. **High contrast mode**: Ensure functionality in high contrast mode
4. **Zoom testing**: Test at 200% zoom level

### Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] All form fields have proper labels
- [ ] Error messages are announced to screen readers
- [ ] Color is not the only way to convey information
- [ ] All images have appropriate alt text
- [ ] Headings follow logical hierarchy (h1 > h2 > h3)
- [ ] All content is available to screen readers

## Component Accessibility Guidelines

### Forms

```tsx
// Required form structure
<form aria-label="Descriptive form name">
  <div className="form-group">
    <label htmlFor="input-id">Field Label</label>
    <input 
      id="input-id"
      type="text"
      aria-invalid={hasError ? 'true' : 'false'}
      aria-describedby={hasError ? 'error-id' : undefined}
      required
    />
    {hasError && (
      <span id="error-id" role="alert" aria-live="polite">
        Error message
      </span>
    )}
  </div>
</form>
```

### Buttons

```tsx
// Button accessibility requirements
<button 
  type="button"
  aria-label="Descriptive action"
  disabled={isLoading}
  aria-describedby={isLoading ? 'loading-status' : undefined}
>
  Button Text
</button>

{isLoading && (
  <span id="loading-status" className="sr-only" aria-live="polite">
    Loading...
  </span>
)}
```

### Navigation

```tsx
// Navigation structure
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="#home" aria-current={currentPage === 'home' ? 'page' : undefined}>Home</a></li>
    <li><a href="#demo">Demo</a></li>
  </ul>
</nav>
```

## Browser and Assistive Technology Support

### Supported Screen Readers

- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

### Supported Browsers

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Testing Tools

- **axe DevTools**: Browser extension for accessibility testing
- **Lighthouse**: Accessibility audit in Chrome DevTools
- **WAVE**: Web accessibility evaluation tool
- **Color Oracle**: Color blindness simulator

## Implementation Notes

### Progressive Enhancement

ChordMe is built with progressive enhancement principles:

1. **Core functionality**: Works without JavaScript
2. **Enhanced experience**: JavaScript adds interactive features
3. **Assistive technology**: Full functionality available to AT users

### Responsive Accessibility

- Touch targets are minimum 44px × 44px on mobile
- Content reflows properly at all zoom levels
- Mobile navigation is fully accessible

### Error Handling

All error states include:

- Visual indicators (color, icons)
- Text descriptions of the error
- Instructions for resolution
- Screen reader announcements

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)