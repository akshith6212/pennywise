<div align="center">
  <br/>
  <img src="mobile/assets/logo.png" alt="Pennywise Logo" width="150" height="150" />
  <h1>Pennywise</h1>
  <h3>Track, Analyze, and Master Your Personal Finances</h3>
  <p>Android app built with React Native</p>
</div>

---

## Overview

Pennywise is a personal finance tracker Android app that helps you track, categorize, and visualize expenses. It features offline-first storage with cloud sync, automated expense import via Gmail + Gemini, and budget tracking with notifications.

## Features

- **Expense Tracking** — Add, edit, tag, merge, and filter expenses
- **Gmail + Gemini Import** — Automatically parse bank transaction emails using Google Gemini AI
- **Budget Management** — Set monthly budgets per category with push notification alerts
- **Insights & Charts** — Pie charts, line charts, and exportable reports (CSV/PDF)
- **Offline-First** — SQLite local cache with Firestore cloud sync
- **Biometric Lock** — Fingerprint/face authentication support
- **Light/Dark Theme** — System-aware theming with 30+ semantic tokens
- **Home Screen Widget** — Quick spending summary widget

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native CLI (non-Expo) |
| Language | TypeScript |
| Engine | Hermes |
| Auth | Firebase Auth + Google Sign-In |
| Database | Cloud Firestore (per-user isolation) |
| Local Cache | SQLite (`react-native-sqlite-storage`) |
| State | Redux Toolkit |
| Navigation | React Navigation v7 |
| Notifications | Notifee (local push) |
| Charts | Custom Canvas-based (PieChart, LineChart) |
| Backend | Firebase Cloud Functions + Google Apps Script |

## Project Structure

```
pennywise/
├── mobile/                 # React Native Android app
│   ├── android/            # Android native project
│   ├── src/
│   │   ├── api/            # ExpenseAPI, LocalDB (SQLite)
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Custom hooks (useAppLock)
│   │   ├── navigation/     # React Navigation setup
│   │   ├── pages/          # Screens (home, insights, budget, settings, login)
│   │   ├── services/       # Notification, Biometric, Reminder, Widget
│   │   ├── store/          # Redux Toolkit (expenseSlice, alertActions)
│   │   ├── styles/         # Theme system
│   │   └── utility/        # Helpers, constants
│   └── __tests__/          # Unit & integration tests
├── functions/              # Firebase Cloud Functions (email parsing API)
├── appScript/              # Google Apps Script (Gmail + Gemini integration)
└── commands/               # Deployment scripts
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Java JDK 17
- Android Studio with SDK 34
- React Native CLI (`npx react-native`)

### Setup

```bash
cd mobile
npm install

# Add your google-services.json to mobile/android/app/
# Configure signing in mobile/android/app/build.gradle

npx react-native run-android
```

### Running Tests

```bash
cd mobile
npm test
```

## Gmail Automation (Apps Script + Gemini)

The email parsing pipeline works independently of the app:

1. **Bank config** is stored in Firestore as `config/emailParseBanks` — configure bank names and match strings in the app under **Settings > Banks**
2. **Apps Script** (`appScript/`) runs on a schedule, fetches Gmail messages matching configured banks
3. Matched emails are sent to **Gemini API** which extracts amount, vendor, and payment type
4. Parsed expenses are written to Firestore via **Cloud Functions** (`functions/`)
5. The mobile app reads these expenses on next sync

## Security

- **Per-user data isolation** — all Firestore data scoped to `users/{uid}/`
- **Firebase Auth** — Google Sign-In with native SDK
- **No server-side data access** — the app reads/writes Firestore directly
- **Biometric lock** — optional fingerprint/face lock on app resume
- **Open source** — inspect the code yourself

## License

This project is licensed under the [MIT License](LICENSE).

---
<div align="center">
  <p>Created with care by <a href="https://github.com/rushikc">rushikc</a></p>
</div>
