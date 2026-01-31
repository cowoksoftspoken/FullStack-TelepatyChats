# Telepaty Chats

Telepaty is a real-time chat application built with Next.js and Firebase. It includes end-to-end encryption (E2EE), WebRTC voice/video calling, media sharing, and push notifications. This repository contains the web app (Next.js App Router) and Firebase Functions for presence sync.

## Key Features
- Email/password auth plus Google and GitHub OAuth.
- Real-time chat with Firestore and Realtime Database (presence and signaling).
- End-to-end encryption for messages and files (libsodium).
- Voice and video calls via WebRTC with TURN support.
- Media sharing: images, video, audio, files, location, and reactions.
- Stories (viewing is enabled; creation is currently a placeholder page).
- Push notifications via Firebase Cloud Messaging (FCM).
- Admin dashboard: verification, broadcast, enable/disable, and delete users.
- E2EE private key backup via QR and cross-device import.

## Tech Stack
- Next.js 16 (App Router) + React 19
- Firebase: Auth, Firestore, Realtime Database, Storage, FCM
- WebRTC (client) + TURN server
- Tailwind CSS + Radix UI + Framer Motion
- libsodium-wrappers for E2EE

## Project Structure
- `app/` - Next.js routes (auth, dashboard, admin, api).
- `components/` - UI, chat, call, story, admin, etc.
- `hooks/` - Custom hooks (WebRTC, FCM, encryption).
- `lib/` - Firebase init, providers, WebRTC manager.
- `functions/` - Firebase Functions (presence sync).
- `public/` - Static assets and FCM service worker.

## Firebase Setup
1. Create a Firebase project.
2. Enable Authentication (Email/Password, Google, GitHub).
3. Enable Firestore, Realtime Database, Storage, and Cloud Messaging (FCM).
4. Create a Web App and copy its config into `.env.local`.
5. Update `public/firebase-messaging-sw.js` to match your Firebase project config.

## Local Setup
1. Copy env file:
   - `copy .env.local.example .env.local`
2. Fill in all values in `.env.local`.
3. Install dependencies:
   - `pnpm install`
4. Start dev server:
   - `pnpm dev`

App runs at `http://localhost:3000`.

## Firebase Functions
Firebase Functions are used to sync presence from Realtime Database to Firestore.

Build and deploy (optional):
- `cd functions`
- `npm install`
- `npm run build`
- `firebase deploy --only functions`

Note: `functions/package.json` requires Node 24.

## API Endpoints
- `POST /api/verify-recaptcha` - verify reCAPTCHA v3 token.
- `POST /api/send-notification` - send FCM to a user.
- `GET /api/cron/cleanup-stories` - delete expired stories (requires `Authorization: Bearer <CRON_SECRET>`).
- `POST /api/admin/toggle-status` - enable/disable a user.
- `POST /api/admin/delete-user` - delete user and related data.

## Security and Encryption Notes
- E2EE private keys are stored in IndexedDB; backup/import via QR or copy key.
- If a private key is lost, old encrypted messages cannot be decrypted.
- `FIREBASE_SERVICE_ACCOUNT` must be kept secret.

## Deployment
- Web app: Vercel or any Next.js hosting.
- Backend: Firebase (Auth/DB/Storage/Functions).
- Story cleanup: schedule an external cron job that calls the cron endpoint with `CRON_SECRET`.

## License
Licensed under the Apache License 2.0. See `LICENSE`.
