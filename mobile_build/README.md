# PIAT Mobile App

This folder contains the Expo-based mobile client for the PIAT School Management System.

## What this app includes

- Student login and dashboard experience
- Attendance-related screens and flows
- Offline-friendly local storage and sync support
- Expo Router navigation for mobile screens

## Requirements

- Node.js 20+
- Expo CLI / Expo Go
- A running backend API for the app to connect to

## Setup

1. Install dependencies:
   ```bash
   cd mobile_build
   npm install
   ```

2. Configure environment variables:
   - Copy the example file if needed:
     ```bash
     cp .env.example .env
     ```
   - Update the API base URL to match your backend host.

3. Start the backend service from the repository root:
   ```bash
   cd ../backend
   npm install
   npm start
   ```

4. Start the mobile app:
   ```bash
   cd ../mobile_build
   npm start
   ```

## Useful scripts

- `npm start` — start the Expo development server
- `npm run android` — launch on Android
- `npm run ios` — launch on iOS
- `npm run web` — run in the browser
- `npm run lint` — run lint checks

## Project structure

- `app/` — screen routes and app entry
- `src/` — app logic, API integration, storage, and state
- `assets/` — images and static assets

## Notes

- If you are testing on a physical device, use your computer’s local network IP instead of `localhost` in the environment configuration.
- The app expects the backend API to be reachable from the device/emulator.
