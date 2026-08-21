# Play Store Listing

## App Details

- **Package name**: com.pennywisemobile
- **App name**: Pennywise - Finance Tracker
- **Category**: Finance
- **Content rating**: Everyone

## Short Description (80 chars max)

Track expenses, budgets & insights with automatic bank email parsing.

## Full Description (4000 chars max)

Pennywise is a personal finance tracker that helps you take control of your spending. Track expenses, set budgets, and gain insights into your financial habits — all with the convenience of automatic expense detection from bank emails.

Key Features:

- Add, edit, and manage expenses with vendor, cost, date, and tags
- Automatic expense parsing from bank notification emails
- Monthly and custom-range budget tracking with visual progress
- Expense insights with charts grouped by day, vendor, cost, or tags
- Tag and vendor tag management for organized categorization
- Auto-tag expenses based on vendor patterns
- Dark mode support
- Cloud sync via Firebase with offline-first SQLite storage
- Google Sign-In authentication

Data & Privacy:

- Your data is stored securely in Firebase with Google authentication
- Local SQLite cache for fast, offline access
- No ads, no third-party analytics beyond Firebase Analytics

## Pre-launch Checklist

1. [ ] Generate signed AAB (`./gradlew bundleRelease`)
2. [ ] Prepare store listing screenshots (phone + 7" tablet)
   - Login screen
   - Expense list
   - Add expense
   - Budget overview
   - Insights charts
   - Settings
3. [ ] Create feature graphic (1024x500 px)
4. [ ] Create app icon (512x512 px, already in mipmap resources)
5. [ ] Complete Play Console data safety questionnaire
   - Collects: email, name (Google Sign-In)
   - Stores: financial data (expenses, budgets) in Firebase
   - No data sharing with third parties
6. [ ] Set up app signing by Google Play (enroll in Play App Signing)
7. [ ] Complete content rating questionnaire
8. [ ] Set pricing: Free
9. [ ] Select target countries
10. [ ] Create internal testing track, upload AAB, invite testers
11. [ ] Promote to closed/open testing after internal validation
12. [ ] Submit for production review

## Release Process

### Internal Testing
```bash
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1
# CI builds signed AAB → upload to internal testing track
```

### Production Release
```bash
git tag v1.0.0
git push origin v1.0.0
# CI builds signed AAB + creates GitHub Release
# Upload AAB to production track in Play Console
```

### Version Bumping

Update `mobile/package.json` version field. The `versionName` in build.gradle reads from package.json automatically. Increment `versionCode` in `android/app/build.gradle` for each Play Store upload.
