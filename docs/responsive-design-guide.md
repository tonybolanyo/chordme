# ChordMe Responsive Design Style Guide

## Overview

ChordMe implements a comprehensive mobile-first responsive design system that ensures optimal user experience across all device types and screen sizes.

## Design Philosophy

### Mobile-First Approach
- CSS is written with mobile devices as the primary target
- Progressive enhancement for larger screens using `min-width` media queries
- Touch-friendly interactions are prioritized

### Breakpoint System

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| `xs` | 320px+ | Small phones |
| `sm` | 480px+ | Large phones |
| `md` | 768px+ | Tablets |
| `lg` | 1024px+ | Small desktops |
| `xl` | 1200px+ | Large desktops |

## CSS Architecture

### Custom Properties
```css
:root {
  /* Breakpoints */
  --breakpoint-xs: 320px;
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1200px;
  
  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
}
```

### Utility Classes

#### Container System
- `.container-responsive`: Responsive container with proper padding
- `.spacing-responsive`: Responsive padding that scales with viewport

#### Grid System
- `.grid-responsive`: Mobile-first grid layout
- `.grid-responsive-md-2`: 2 columns on tablet+
- `.grid-responsive-lg-3`: 3 columns on desktop+

#### Flexbox System
- `.flex-responsive`: Column layout on mobile, row on desktop
- `.flex-responsive-md-row`: Horizontal layout on tablet+

#### Editor Layout
- `.editor-layout-responsive`: Stacked on mobile, side-by-side on desktop
- `.editor-main-responsive`: Main editor area
- `.editor-sidebar-responsive`: Chord palette sidebar

## Component Patterns

### Navigation
- **Mobile (< 768px)**: Stacked header with hamburger menu
- **Tablet+ (≥ 768px)**: Horizontal navigation bar

### Forms
- **Mobile**: Full-width inputs with touch-friendly sizing (44px min-height)
- **Desktop**: Constrained width with larger padding

### Editor Interface
- **Mobile/Tablet (< 1024px)**: Vertical stack (editor above chord palette)
- **Desktop (≥ 1024px)**: Side-by-side layout

## Touch Interactions

### Touch Target Guidelines
- Minimum touch target size: 44px × 44px
- Interactive elements use `.touch-target` class
- Hover states are disabled on touch devices

### Mobile-Specific Features
- Hamburger navigation menu
- Optimized chord palette for touch selection
- Scrollable editor areas with proper touch handling

## Responsive Typography

| Screen Size | Base Font Size | Line Height |
|-------------|---------------|-------------|
| Mobile      | 14px          | 1.4         |
| Tablet+     | 16px          | 1.5         |
| Desktop     | 16px          | 1.6         |

## Component Behavior

### Header Navigation
```
Mobile (< 768px):
├── Logo (centered)
├── Hamburger menu button
└── Slide-out navigation panel

Desktop (≥ 768px):
├── Logo (left)
└── Horizontal navigation (right)
```

### ChordPro Demo Layout
```
Mobile/Tablet (< 1024px):
├── Instructions
├── Editor controls
├── Editor textarea
├── Rendered output
└── Chord palette

Desktop (≥ 1024px):
├── Instructions
├── Editor area (left)
│   ├── Controls
│   ├── Textarea
│   └── Rendered output
└── Chord palette (right, sticky)
```

## Accessibility Features

All interactive elements meet WCAG 2.1 touch target guidelines (minimum 44px × 44px)
- Proper semantic HTML structure with landmark roles
- ARIA labels for mobile navigation and complex interactions
- Screen reader friendly content organization with proper heading hierarchy
- Keyboard navigation support for all interactive elements
- Color contrast ratios meeting WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- Focus indicators clearly visible for keyboard users
- Screen reader announcements for dynamic content changes

### Accessibility Color System

The responsive design includes a comprehensive accessibility-first color system:

```css
:root {
  /* WCAG AA compliant colors */
  --primary-color: #1e3a8a; /* 7.47:1 contrast with white */
  --primary-hover: #1e40af; /* 6.78:1 contrast with white */
  --text-primary: #111827; /* 16.91:1 contrast with white */
  --text-secondary: #374151; /* 8.87:1 contrast with white */
  --text-muted: #6b7280; /* 4.59:1 contrast with white */
  --focus-color: #2563eb; /* 5.85:1 contrast for focus indicators */
}
```

### Keyboard Navigation Support

- Tab order follows logical flow
- All interactive elements are keyboard accessible
- Focus indicators clearly visible
- Escape key closes modals and dropdowns
- Arrow keys navigate within component groups

### Screen Reader Support

- Semantic HTML with proper landmark roles (`<nav>`, `<main>`, `<header>`, `<footer>`)
- ARIA labels for complex interactions
- Skip navigation links for efficient navigation
- Screen reader announcements for dynamic content changes

## Browser Support

- Modern mobile browsers (iOS Safari, Chrome Mobile)
- Tablet browsers (iPad Safari, Android Chrome)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers

## Testing Guidelines

### Manual Testing Checklist
- [ ] Test on mobile viewport (375px × 667px)
- [ ] Test on tablet viewport (768px × 1024px)
- [ ] Test on desktop viewport (1200px × 800px)
- [ ] Verify touch target sizes on mobile
- [ ] Test hamburger menu functionality
- [ ] Verify editor layout responsiveness
- [ ] Check form usability on all screen sizes

### Automated Testing
- Unit tests for responsive utility functions
- E2E tests for viewport-specific behavior
- Visual regression tests for layout breakpoints

## Performance Considerations

- CSS custom properties for efficient responsive calculations
- Minimal JavaScript for viewport detection
- Progressive loading of mobile-specific features
- Optimized touch event handling

## Future Enhancements

- Bottom navigation for mobile (if needed)
- Gesture support for mobile interactions
- Advanced tablet-specific layouts
- PWA mobile app features