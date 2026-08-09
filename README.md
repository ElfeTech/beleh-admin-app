# Beleh Admin Dashboard

A stunning administrative interface for managing the Beleh AI BI platform.

## Features

- **Admin JWT auth**: Firebase Google sign-in exchanged for a short-lived admin JWT (`sessionStorage`).
- **Modern shell**: Dark sidebar + light content canvas, teal accent, IBM Plex typography.
- **Animated login**: SVG circuit wires with traveling nodes (Framer Motion).
- **Full admin surface**: Users, workspaces, plans, usage, chat-runs, connectors, datasources, feedback, providers, ops.
- **React Query**: Cached queries with keys like `['admin', 'users']`.

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Data**: [@tanstack/react-query](https://tanstack.com/query) + Axios (`AdminApiClient`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Authentication**: [Firebase](https://firebase.google.com/) → Admin Platform JWT

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your Firebase credentials.
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application views.
- `src/services`: API and Authentication logic.
- `src/lib`: Configuration for Firebase and other libraries.
- `src/hooks`: Custom React hooks.
