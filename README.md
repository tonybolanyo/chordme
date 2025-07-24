# ChordMe

Lyrics and chords in a simple way

## Project Structure

This project consists of two main parts:

- **Backend**: Python Flask API (in `/backend`)
- **Frontend**: React with TypeScript (in `/frontend`)

## Frontend Setup

The frontend is built with:
- **React 19** with TypeScript
- **Vite** for fast development and building
- **ESLint** and **Prettier** for code quality
- Modern folder structure with components, pages, services, and utilities

### Getting Started

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run preview` - Preview production build

### Folder Structure

```
frontend/src/
├── components/     # Reusable UI components
│   ├── Header/
│   └── Layout/
├── pages/         # Page components
│   └── Home/
├── services/      # API and external service calls
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── assets/        # Static assets
```

## Backend Setup

See the `/backend` directory for backend setup instructions.
