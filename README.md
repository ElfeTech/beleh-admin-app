# Beleh Admin Dashboard

A stunning administrative interface for managing the Beleh AI BI platform.

## Features

- **Admin JWT auth**: Firebase Google sign-in exchanged for a short-lived admin JWT (`sessionStorage`).
- **Modern shell**: Dark sidebar + light content canvas, teal accent, IBM Plex typography.
- **Animated login**: SVG circuit wires with traveling nodes (Framer Motion).
- **Full admin surface**: Users, workspaces, plans, usage, chat-runs, connectors, datasources, feedback, providers, ops.
- **Billing ledger**: Stripe webhook transaction history + all subscriptions with MRR summary (`/billing`).
- **System logs**: captured backend warnings/errors with tracebacks, request-id correlation, and purge (`/logs`).
- **Admin audit**: every mutating admin API call recorded — who, what, status, duration (`/audit`).
- **User investigation**: per-user usage (month totals + 30-day chart), recent chat runs, and billing events on the user detail page.
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

## Google sign-in on deployed hosts

Symptom this section exists for: Google sign-in succeeds, then the app silently
bounces back to `/login` with no error — often only in *some* browsers/accounts,
which makes it look account-specific (it is not).

Cause: the Firebase `authDomain` (`beleh-ai.firebaseapp.com`) is a different
site than the deployed origin. Firebase's redirect flow completes the sign-in
through a hidden iframe on the authDomain, which needs **third-party storage**.
Browsers that block or partition it (Chrome 115+, Safari, Brave, any
"block third-party cookies" profile) drop the handshake: `getRedirectResult()`
resolves to `null` with no error, and the user lands back on `/login`.

What the code does now:

1. **Popup-first everywhere** (`signInWithPopup` talks back via `postMessage`,
   no third-party storage needed). Full-page redirect is only a fallback when
   the popup is blocked.
2. If a redirect attempt comes back without a session, the login page shows an
   explicit error instead of silently bouncing.

### Recommended: first-party auth domain (makes every flow reliable)

`vercel.json` already proxies `/__/auth/*` and `/__/firebase/*` to
`beleh-ai.firebaseapp.com`, so the deployed origin can serve the Firebase auth
helper itself. To activate it:

1. **Vercel → Project → Settings → Environment Variables**: set
   `VITE_FIREBASE_AUTH_DOMAIN` to the deployed admin domain (e.g.
   `beleh-admin-app.vercel.app` — no protocol), for Production.
2. **Firebase console → Authentication → Settings → Authorized domains**: make
   sure that domain is listed (it already is if sign-in ever worked there).
3. **Google Cloud console → APIs & Services → Credentials →** the OAuth 2.0 Web
   client that Firebase Auth uses (named "Web client (auto created by Google
   Service)") **→ Authorized redirect URIs**: add
   `https://<that domain>/__/auth/handler`.
4. Redeploy. Sign-in (popup *and* redirect) now happens entirely on the app's
   own origin — no cross-site storage involved, stable in every browser.

Until step 1 is done the proxy rewrites are inert and the popup-first flow from
the code carries deployed logins.

## Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application views.
- `src/services`: API and Authentication logic.
- `src/lib`: Configuration for Firebase and other libraries.
- `src/hooks`: Custom React hooks.
