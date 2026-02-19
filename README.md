# BAPU Handle Management System

This repository contains the automated system for managing AT Protocol (Bluesky) handles under BAPU domains.

## Components

### 1. Backend (`/backend`)
A Node.js Express server that interacts with Cloudflare and AT Protocol.

**Setup:**
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your `CLOUDFLARE_API_TOKEN`.
4. `node server.js`

**API Endpoints:**
- `GET /api/domains`: Lists active zones from Cloudflare.
- `GET /api/check-handle`: Checks if a handle is available in DNS and reservations.
- `POST /api/automate-all`: Handles the entire flow: verifies availability, sets DNS, and updates the user's Bluesky handle.

### 2. Mobile App (`/mobile_app`)
A Flutter-based Android application for users.

**CI/CD:**
This project uses GitHub Actions to automatically build the APK. You can download the latest build from the "Actions" tab of the repository under "Artifacts".

**Setup:**
1. `cd mobile_app`
2. Ensure Flutter is installed.
3. Update `_baseUrl` in `lib/main.dart` to point to your deployed backend.
4. `flutter pub get`
5. `flutter run` (or `flutter build apk`)

**Features:**
- Login with Bluesky Handle + App Password.
- Real-time availability check.
- Automated handle switching.
- History of reserved handles.

## Technical Infrastructure Requirements
- **Cloudflare Account**: To manage the domains.
- **Node.js Hosting**: To run the backend (e.g., VPS, Heroku, Render).
- **SQLite**: Used for persistence (stored in `backend/handles.db`).
