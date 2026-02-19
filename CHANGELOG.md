# Changelog

All notable changes to this project will be documented in this file.

## [2026-02-18]

### Added
- **Automated Handle Management System**: A new backend and mobile app to manage AT Protocol handles.
- **Backend (Node.js)**:
  - Express server with SQLite for handle reservations.
  - Integration with Cloudflare API to manage DNS TXT records.
  - Integration with @atproto/api for automated handle updates on Bluesky.
  - Endpoints for domain listing, availability checking, and full automation flows.
- **Mobile App (Flutter)**:
  - Simple Android app for users to manage their handles.
  - Secure storage for app passwords.
  - Real-time handle availability checking.
  - One-click "Claim & Update" automation.
  - History of reserved handles allowing easy switching.
- **Configuration**:
  - `.env.example` for backend configuration.
  - `.gitignore` updated to include Node.js and Flutter artifacts.
