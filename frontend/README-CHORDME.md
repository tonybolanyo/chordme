# ChordMe Frontend

React + TypeScript frontend for the ChordMe application.

## Technologies

- **React 19** - Modern React with latest features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **ESLint** - Code linting and best practices
- **Prettier** - Code formatting

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Development

### Code Quality

This project uses ESLint and Prettier to maintain code quality:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Project Structure

- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/services/` - API calls and external services
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/assets/` - Static assets (images, icons, etc.)

### Environment Variables

Copy `.env` and adjust the values as needed:

```
VITE_API_BASE_URL=http://localhost:5000
```

## Building

```bash
npm run build
```

The built files will be in the `dist/` directory.