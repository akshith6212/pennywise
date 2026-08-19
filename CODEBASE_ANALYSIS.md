# Pennywise Codebase Analysis

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [File-by-File Analysis](#file-by-file-analysis)
   - [Root Configuration Files](#root-configuration-files)
   - [Source Entry Points](#source-entry-points)
   - [Type Definitions](#type-definitions)
   - [Firebase Configuration](#firebase-configuration)
   - [API Layer](#api-layer)
   - [State Management (Redux)](#state-management-redux)
   - [Custom Hooks](#custom-hooks)
   - [Reusable Components](#reusable-components)
   - [Pages](#pages)
   - [Utility & Constants](#utility--constants)
   - [Styles](#styles)
   - [Cloud Functions (Firebase)](#cloud-functions-firebase)
   - [Apps Script (Gmail + Gemini)](#apps-script-gmail--gemini)
   - [Build Scripts](#build-scripts)
   - [Public Assets](#public-assets)
5. [Data Flow](#data-flow)
6. [Android Mobile App - Migration Analysis](#android-mobile-app---migration-analysis)

---

## Project Overview

**Pennywise** is an open-source personal finance tracking web application. Users can:
- Track daily expenses (manual entry + automated Gmail import via Gemini AI)
- Categorize expenses with custom tags
- Visualize spending via charts (line/pie)
- Set monthly budgets and track progress
- Export reports as XLSX/CSV
- Configure bank email parsing for automated expense capture

The app is self-hosted on the user's own Google Cloud/Firebase project, meaning user data stays entirely under their control.

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (CRA + CRACO) |
| Language | TypeScript 4.7 |
| Component Library | Material-UI (MUI) v6 |
| State Management | Redux Toolkit |
| Routing | React Router DOM v6 |
| Cloud Database | Firebase Firestore (lite SDK) |
| Local Cache | IndexedDB (raw API, no `idb` wrapper used in practice) |
| Authentication | Firebase Auth + Google OAuth (popup flow) |
| Charts | Recharts |
| Animations | Framer Motion |
| Date Library | dayjs |
| HTTP Client | axios (declared but not directly used in current API layer) |
| Export | exceljs (XLSX), json-2-csv (CSV), file-saver |
| Styling | SCSS + Bootstrap + MUI theming |
| Build Tooling | CRACO (CRA override), Webpack (via CRA) |
| Serverless Backend | Firebase Cloud Functions (v2 onRequest) |
| Email Automation | Google Apps Script + Gemini AI API |

---

## Architecture Overview

```
User (Browser)
  |
  |-- React SPA (MUI + Redux + React Router)
  |     |-- Firebase Auth (Google OAuth popup)
  |     |-- Firestore (lite SDK, direct reads/writes)
  |     |-- IndexedDB (offline cache layer)
  |
  |-- Firebase Hosting (serves SPA build)
  |
  |-- Firebase Cloud Functions (v2)
  |     |-- addExpenseData (POST)
  |     |-- getOneDoc (POST)
  |     |-- setOneDoc (POST)
  |     |-- getAllDoc (POST)
  |     |-- Auth: Bearer token validated against Google tokeninfo
  |
  |-- Google Apps Script (hourly trigger)
        |-- Gmail API (read-only, list + get messages)
        |-- Gemini AI API (extract expense from email text)
        |-- Cloud Functions (persist parsed expenses to Firestore)
```

### Firestore Collections
| Collection | Key Format | Purpose |
|---|---|---|
| `expense` | `DD MMM YY, hh:mm A <vendor>` | Individual expense records |
| `vendorTag` | vendor name | Vendor-to-tag auto-mapping |
| `budget` | `<name>_<timestamp>` | Budget definitions |
| `config` | `tags`, `bankConfig`, `darkMode`, `emailParseBanks`, `lastGmailId` | App configuration documents |

### IndexedDB Stores (Database: "Finance", version 5)
| Store | Key Path | Purpose |
|---|---|---|
| `expense` | `mailId` | Cached expenses |
| `vendorTag` | `vendor` | Cached vendor-tag maps |
| `config` | `key` | Last-update timestamps, cached bank config |
| `budget` | `id` | Cached budgets |

---

## File-by-File Analysis

### Root Configuration Files

#### `package.json`
- **Name**: `finance-app`, **Version**: `1.1.0`
- **Scripts**: `start` (craco start), `build` (generates build info + craco build), `test` (craco test), `lint` (eslint)
- **Key dependencies**: React 18, MUI v6, Redux Toolkit, Firebase v11, Recharts, Framer Motion, dayjs, exceljs, uuid
- **Engine requirements**: Node >= 22, npm >= 10

#### `tsconfig.json`
- Standard CRA TypeScript config with ES2016 module target.

#### `craco.config.js`
- Customizes CRA's Webpack config (CSS minimizer, terser, bundle analyzer).

#### `firebase.json`
- Configures Firestore (asia-south2 region), Cloud Functions deployment, and Firebase Hosting (serves `build/` with SPA rewrite).

#### `firestore.indexes.json`
- Empty indexes array and field overrides (no custom composite indexes defined).

#### `.eslintrc.json`
- TypeScript ESLint parser configuration.

#### `.editorconfig`
- 2-space indentation, LF line endings, UTF-8.

#### `.gitignore`
- Ignores `node_modules`, `build`, `.env`, IDE files, coverage, etc.

---

### Source Entry Points

#### `src/index.tsx`
- **Purpose**: Application bootstrap/mount point.
- Wraps `<App>` with Redux `<Provider>` and React Router `<BrowserRouter>`.
- Mounts into `#root` DOM element via `createRoot`.
- Imports Bootstrap CSS globally.

#### `src/App.tsx`
- **Purpose**: Root application component with routing, theming, and auth.
- Initializes IndexedDB via `FinanceIndexDB.initDB()`.
- Creates MUI light/dark themes based on Redux `appConfig.darkMode`.
- Wraps everything in `<AuthProvider>` and `<ThemeProvider>`.
- Defines `<ProtectedRoute>` component that:
  - Redirects to `/login` if no `currentUser`.
  - Calls `loadInitialAppData()` on first authenticated load.
- Renders `<BottomNavAuth>` (bottom navigation, hidden when logged out).
- Renders `<TagExpenses>` modal globally (controlled by Redux `isTagModal`).
- Renders `<AlertComponent>` globally for toast notifications.
- Renders `<ThemeManager>` to apply `data-theme` attribute to `<html>`.
- Uses `<Suspense>` with lazy-loaded routes.

#### `src/routes.ts`
- **Purpose**: Centralized route definitions with lazy-loaded components.
- **Routes** (all protected):
  | Path | Component | Description |
  |---|---|---|
  | `/home` | Home | Main expense list/dashboard |
  | `/profile` | Settings | User settings page |
  | `/stats` | Insights | Charts & analytics |
  | `/budget` | Budget | Budget management |
  | `/config` | Configuration | Bank account settings |
  | `/setting-tags` | ManageTags | CRUD for expense tags |
  | `/setting-tag-maps` | ManageVendorTags | Vendor-to-tag mappings |
  | `/reload-expense` | ReloadData | Reload data from Firestore |
  | `/auto-tag-expenses` | AutoTagExpenses | Batch auto-tagging |
  | `/setting-banks` | ManageBanks | Email parsing bank config |

---

### Type Definitions

#### `src/Types.ts`
- **Purpose**: Central TypeScript interfaces for the entire app.

| Interface | Fields | Usage |
|---|---|---|
| `Expense` | `id`, `tag?`, `mailId`, `cost`, `costType` (credit/debit), `date` (unix ms), `modifiedDate`, `user`, `type` (payment method), `vendor`, `operation` | Core expense entity |
| `VendorTag` | `id`, `vendor`, `tag`, `date` | Auto-tag mapping |
| `Alert` | `id`, `type` (success/error/info/warning), `message` | Toast notifications |
| `BankConfig` | `enableUpi`, `creditCards[]` | Legacy bank config |
| `BankEmailParsingEntry` | `id`, `displayName`, `matchStrings[]` | Gemini email parsing bank config |
| `Config` | `key`, `value` | IndexedDB config store entries |
| `AppConfig` | `darkMode` | App-level settings |
| `Budget` | `id`, `name`, `amount`, `tagList[]`, `modifiedDate`, `operation?` | Budget entity |
| `BudgetProgress` | `budget`, `spent`, `remaining`, `percentage` | Computed budget status |
| `MonthYear` | `month`, `year`, `label`, `value` | Month picker option |

---

### Firebase Configuration

#### `src/firebase/firebase-public.ts`
- **Purpose**: Firebase config object using environment variables.
- All values sourced from `REACT_APP_FIREBASE_*` env vars.
- Keys: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

#### `src/firebase/firebaseConfig.ts`
- **Purpose**: Initialize Firebase App, Auth, and Google Auth Provider.
- Exports `auth` (Firebase Auth instance) and `googleProvider` (GoogleAuthProvider).

---

### API Layer

#### `src/api/ExpenseAPI.ts`
- **Purpose**: Central data access layer bridging Firestore and IndexedDB.
- **Architecture**: Static class methods. Direct Firestore SDK calls (not via Cloud Functions).
- **Key methods**:

| Method | Description |
|---|---|
| `addExpense(expense, operation)` | Saves to Firestore + IndexedDB. Generates key from date+vendor. |
| `deleteExpense(expense)` | Deletes from Firestore + IndexedDB by id/mailId. |
| `getExpenseList(overrideLastDate?)` | Incremental sync: fetches Firestore docs modified since last sync, merges into IndexedDB, returns full local list. |
| `getTagList()` | Reads `config/tags` doc from Firestore. |
| `updateTagList(tags)` | Writes `config/tags` doc. |
| `getBankConfig()` | Reads `config/bankConfig` (UPI toggle, credit cards). |
| `updateBankConfig(config)` | Writes `config/bankConfig`. |
| `getDarkModeConfig()` | Reads `config/darkMode`. |
| `updateDarkMode(val)` | Writes `config/darkMode`. |
| `getVendorTagList()` | Incremental sync for vendor-tag mappings. |
| `updateVendorTag(vendorTag)` | Writes single vendor-tag to Firestore. |
| `deleteVendorTag(vendorTagId)` | Deletes vendor-tag from Firestore. |
| `autoTagPastExpenses(startDate)` | Batch operation: matches untagged expenses against vendor-tag map, updates in batches of 700. |
| `getEmailParseBankList()` | Reads `config/emailParseBanks` with IndexedDB cache. |
| `updateEmailParseBankList(banks)` | Write-through cache: Firestore + IndexedDB. |
| `addBudget/updateBudget/deleteBudget/getBudgetList` | Full CRUD for budgets with incremental sync pattern. |

- **Caching strategy**: Stores `lastUpdate` timestamps in IndexedDB config store. On fetch, queries Firestore for `modifiedDate >= lastUpdate`, merges results into IndexedDB, then returns full IndexedDB contents.

#### `src/api/FinanceIndexDB.ts`
- **Purpose**: IndexedDB wrapper for local data caching.
- **Database**: `Finance`, version 5.
- **Static class** with methods:
  - `initDB()`: Creates object stores with key paths and indexes.
  - `batchInsert()`: Generic batch put operation.
  - `addExpenseList()`, `addVendorTag()`, `addConfig()`, `addBudgetList()`: Store-specific inserts.
  - `getData()`, `getAllData()`: Read operations.
  - `deleteExpense()`, `deleteBudget()`: Delete by key.
  - `clearIndexedDBData()`: Deletes entire database (used on sign-out).

#### `src/api/ProcessData.ts`
- **Purpose**: One-off data migration/processing utility.
- Contains methods for batch-processing expenses and vendor names (mostly dormant/commented out).
- Has a `processBudget()` method with sample budget data for seeding.

---

### State Management (Redux)

#### `src/store/store.ts`
- **Purpose**: Redux store configuration.
- Single reducer: `expenseSlice`.
- Middleware: default with serializable check (no ignored paths currently).

#### `src/store/expenseSlice.ts`
- **Purpose**: Main Redux slice containing all application state.
- **State shape**:

| Field | Type | Description |
|---|---|---|
| `expenseList` | `Expense[]` | All loaded expenses |
| `budgetList` | `Budget[]` | All loaded budgets |
| `expense` | `Expense | null` | Currently selected expense (for tag modal) |
| `vendorTagList` | `VendorTag[]` | Vendor-to-tag mappings |
| `bankConfig` | `BankConfig` | Bank configuration |
| `appConfig` | `AppConfig` | App settings (darkMode) |
| `isAppLoading` | `boolean` | Initial data load flag |
| `isTagModal` | `boolean` | Tag expense modal visibility |
| `tagList` | `string[]` | Available tags |
| `alerts` | `Alert[]` | Active toast alerts |

- **Reducers**: `setExpenseList`, `setTagExpense`, `setTagMap`, `updateExpense`, `deleteExpense`, `hideTagExpense`, `setExpenseState`, `setTagList`, `addTag`, `deleteTag`, `mergeSaveExpense`, `toggleDarkMode`, `addAlert`, `removeAlert`, `clearAllAlerts`, `setBudgetList`, `addBudget`, `updateBudget`, `deleteBudget`.

#### `src/store/expenseActions.ts`
- **Purpose**: Action dispatcher helpers (avoid importing store+slice everywhere).
- Exports `selectExpense` selector and action dispatch functions.
- Pattern: `export const setExpenseList = (expenses) => store.dispatch(expenseSlice.actions.setExpenseList(expenses))`.

#### `src/store/alertActions.ts`
- **Purpose**: Timed alert creation with auto-removal.
- `createTimedAlert(alert, timeout=3000)`: Dispatches alert with generated ID, sets `setTimeout` to auto-remove.
- `removeAlert(alertId)`: Manual removal.

---

### Custom Hooks

#### `src/hooks/useAuth.ts`
- **Purpose**: Authentication state management hook.
- Listens to `onAuthStateChanged` from Firebase Auth.
- Returns `currentUser`, `userProfile` (name, email, photoUrl, uid), `isLoading`, `signOut`.
- `signOut()` clears IndexedDB, reinitializes DB, then signs out from Firebase.

#### `src/hooks/useCloseOnOutsideClick.ts`
- **Purpose**: Closes a panel when clicking outside it or scrolling.
- Parameters: `isOpen`, `onClose`, `panelRef`, `buttonRef`.
- Attaches `mousedown` and `scroll` listeners when panel is open.

#### `src/hooks/useLongPress.ts`
- **Purpose**: Detects long-press gestures on both touch and mouse.
- Returns event handlers: `onMouseDown`, `onTouchStart`, `onMouseUp`, `onMouseLeave`, `onTouchEnd`.
- Configurable `delay` (default 500ms) and `moveThreshold` (10px).
- Distinguishes between scroll/drag and intentional long-press.
- Used for entering expense selection mode on the Home page.

---

### Reusable Components

#### `src/components/BottomNav.tsx`
- **Purpose**: Bottom navigation bar with 4 tabs.
- Tabs: Home, Stats (Insights), Budget, Profile (Settings).
- Syncs active tab with current URL path.
- Uses MUI `BottomNavigation` component.

#### `src/components/Alert.tsx`
- **Purpose**: Global toast notification system.
- Renders stacked MUI `Alert` components from Redux `alerts` state.
- Supports success/error/info/warning types.
- Each alert has a close button for manual dismissal.
- Positioned fixed at top of viewport via CSS.

#### `src/components/Alert.scss`
- Styles for alert container positioning and stacking.

#### `src/components/Loading.tsx`
- **Purpose**: Simple centered circular progress spinner.
- Used as loading state across multiple pages.

#### `src/components/DashboardTile.tsx`
- **Purpose**: Reusable settings menu tile with icon, title, subtitle.
- Uses Framer Motion for entry animation.
- Renders divider between tiles (except last).

#### `src/components/ProfileAvatar.tsx`
- **Purpose**: User profile image component with fallback.
- Shows user photo from Google profile URL.
- Falls back to account icon on image load error.

#### `src/components/ThemeManager.tsx`
- **Purpose**: Applies `data-theme="dark"` or `data-theme="light"` to `<html>` element.
- Listens to Redux `appConfig.darkMode` state.
- Renders nothing (side-effect only component).

#### `src/components/ErrorHandlers.tsx`
- **Purpose**: Global API error handling with access-denied modal.
- `handleApiError(error)`: Detects 401/403/permission-denied errors, shows modal.
- `showAccessDeniedModal()`: Creates portal-mounted error modal with "Sign In Again" button.
- Modal forces sign-out and redirects to `/login`.

---

### Pages

#### `src/pages/login/Login.tsx`
- **Purpose**: Google Sign-In page.
- Shows Pennywise logo, app title, and "Sign in with Google" button.
- Calls `signInWithGoogle()` from AuthContext, navigates to `/home` on success.
- Displays error message on failure.

#### `src/pages/login/AuthContext.tsx`
- **Purpose**: React Context provider for authentication.
- Wraps app with `AuthProvider` that manages `currentUser` and `loading` state.
- Exposes `useAuth()` hook with `currentUser`, `loading`, `signInWithGoogle`, `signOut`.
- Renders children only after auth state is determined (`!loading`).

#### `src/pages/login/AuthService.ts`
- **Purpose**: Firebase Auth operations.
- `signInWithGoogle()`: Uses `signInWithPopup` with Google provider.
- `signOut()`: Clears IndexedDB, then signs out from Firebase.
- `onAuthStateChanged()`: Wraps Firebase auth listener.

#### `src/pages/home/Home.tsx`
- **Purpose**: Main expense dashboard (most complex page).
- **Features**:
  - Search bar (filters by vendor, cost, tag).
  - Date range filter (1d to All Time).
  - Group-by options (days, vendor, cost range, tags).
  - Sort-by options (total cost, expense count).
  - Grouped expense display with collapsible sections.
  - Each group shows label, count, total amount.
  - Individual expense rows show avatar, vendor name, cost, date, tag.
  - Long-press to enter selection mode.
  - Selection mode: delete, merge selected expenses.
  - FAB button to add new expense.
  - Scroll-to-top button.
  - Collapse/expand all groups button.
- **Sub-components** (inline): `FilterPanel`, `GroupByPanel`, `ExpenseItem`.

#### `src/pages/home/Home.scss`
- Extensive SCSS for the home page layout, expense rows, filter/group panels, selection mode, animations, scroll buttons.

#### `src/pages/home/home-views/AddExpense.tsx`
- **Purpose**: Modal dialog to manually add a new expense.
- Fields: cost (number input with rupee prefix), tag selection (chip list).
- Auto-generates `mailId` via UUID, sets vendor as `<random> manual entry`.
- Saves via `ExpenseAPI.addExpense()` and updates Redux store.

#### `src/pages/home/home-views/TagExpenses.tsx`
- **Purpose**: Modal dialog to tag/re-tag an existing expense.
- Shows vendor name (with UPI ID if present), date, cost, current tag.
- Offers "Auto tag future transactions" toggle (creates vendor-tag mapping).
- Tag selection via chip list from Redux `tagList`.
- Saves expense update + optional vendor-tag mapping.
- Copy-to-clipboard for UPI IDs.

#### `src/pages/home/home-views/TagExpenses.scss`
- Styles for both TagExpenses and AddExpense dialogs (shared).

#### `src/pages/home/home-views/MergeExpenses.tsx`
- **Purpose**: Modal dialog to merge multiple selected expenses into one.
- Shows total cost (summed with debit/credit awareness).
- Vendor selection from unique vendors across selected expenses.
- Tag selection from global tag list.
- Soft-deletes originals, creates merged expense via API.

#### `src/pages/insights/Insights.tsx`
- **Purpose**: Analytics and visualization page.
- **Features**:
  - Summary cards: Total Spending, Daily Average/Median, Monthly Average/Median.
  - Line chart (spending trends) when grouped by days.
  - Pie chart (distribution) when grouped by vendor/tags/cost range.
  - Configurable calculation method (average vs median).
  - Item selection panel for choosing which groups to display.
  - Export buttons: XLSX and CSV.
  - Date range filter and group-by options (same as Home).
- Uses rolling 7-day window for smoothed line chart data.

#### `src/pages/insights/Insights.scss`
- Styles for insights page: chart containers, summary cards (gradient backgrounds), filter panels, export buttons.

#### `src/pages/insights/Graph.tsx`
- **Purpose**: Reusable chart components using Recharts.
- `LineGraph`: Multi-line chart with cartesian grid, axes, tooltips, legend. Theme-aware colors.
- `PieGraph`: Donut chart (inner/outer radius) with labels showing rupee values. Has optional selection toggle button.
- Both handle empty data state gracefully.

#### `src/pages/insights/exportReport.ts`
- **Purpose**: Export expense data to files.
- `exportAsXLSX()`: Creates workbook with styled header, bordered cells via exceljs. Downloads via file-saver.
- `exportAsCSV()`: Converts formatted data to CSV via json-2-csv. Downloads via file-saver.
- Shared helpers: `validateExpenses()`, `formatExpenses()`, `generateFilename()`.

#### `src/pages/budget/Budget.tsx`
- **Purpose**: Budget overview page.
- Shows budget cards with progress bars (spent/remaining/percentage).
- Color-coded progress: green (<85%), yellow (85-100%), red (>100%).
- Monthly filter with year/month selection panel.
- FAB button to add new budget.
- Click card to edit existing budget.
- Animated card entry via Framer Motion.

#### `src/pages/budget/Budget.scss`
- Styles for budget cards, progress bars, filter panels.

#### `src/pages/budget/EditBudget.tsx`
- **Purpose**: Modal dialog for creating/editing budgets.
- Fields: name, amount (rupee prefix), tag selection (multi-select chips).
- Add mode (null budget) vs Edit mode (existing budget).
- Delete button only shown in edit mode.
- Validates: name not empty, amount > 0, at least one tag selected.
- Uses timed alerts for success/error feedback.

#### `src/pages/setting/Settings.tsx`
- **Purpose**: Settings/profile page.
- Shows user profile card (photo, name, email).
- Dashboard tiles grid for navigation:
  - Tags, Theme Toggle, Reload Data, Manage Vendor Tags, Auto-tag Expenses, Banks, Sign Out.
- Version display (clickable for app info modal).
- App info modal shows version, build time, author, GitHub link.
- Build info loaded from auto-generated `buildInfo.ts` file.

#### `src/pages/setting/settings.scss`
- Styles for settings page: profile card, dashboard tiles, version display, app info modal.

#### `src/pages/setting/setting-views/ManageTags.tsx`
- **Purpose**: CRUD for expense tags.
- Displays tags as deletable chips in a cloud layout.
- Add tag via dialog with text input.
- Delete tag with confirmation dialog.
- Syncs with Firestore via `ExpenseAPI.updateTagList()`.

#### `src/pages/setting/setting-views/ManageVendorTags.tsx`
- **Purpose**: Manage vendor-to-tag auto-mapping rules.
- Searchable list of vendor-tag pairs.
- Click to edit (change tag assignment).
- Delete button on each item.
- Edit dialog shows vendor name and tag selection chips.

#### `src/pages/setting/setting-views/ReloadData.tsx`
- **Purpose**: Data management utilities.
- Three sections:
  1. **Reload by Date**: Date picker + reload button (fetches expenses from selected date).
  2. **Reload All**: Fetches all expenses from 2020 (with billing warning).
  3. **Clear Cache**: Deletes entire IndexedDB (forces full re-sync).
- Uses MUI DatePicker with dayjs adapter.

#### `src/pages/setting/setting-views/AutoTagExpenses.tsx`
- **Purpose**: Batch auto-tagging of past expenses.
- Two sections:
  1. **By Date**: Auto-tag expenses from a selected start date.
  2. **All**: Auto-tag all expenses (from 2020).
- Shows success count after operation completes.
- Info banner explaining the feature.

#### `src/pages/setting/setting-views/ManageBanks.tsx`
- **Purpose**: Configure banks for Gmail email parsing.
- Each bank entry has a display name and match strings (phrases that appear in bank alert emails).
- Add bank dialog: display name + multiline match strings (comma/newline separated).
- Delete with confirmation.
- Data persisted via `ExpenseAPI.updateEmailParseBankList()`.

#### `src/pages/setting/setting-views/Configuration.tsx`
- **Purpose**: Legacy bank account settings.
- UPI toggle switch (HDFC specific).
- Credit card management: add/remove last-4-digits cards.
- Persisted via `ExpenseAPI.updateBankConfig()`.

#### `src/pages/setting/setting-views/settingViews.scss`
- Shared styles for all setting sub-views: headers, papers, buttons, lists, date pickers.

#### `src/pages/dataValidations.ts`
- **Purpose**: Data filtering, searching, grouping, and initial data loading.
- **`loadInitialAppData()`**: Called once on first authenticated page load. Fetches all data in parallel: vendorTags, expenses, budgets, tagList, darkMode config. Populates Redux store.
- **Filter options**: Date ranges from 1 day to "All Time" (1800 days).
- **Group-by options**: days, vendor, cost ranges (0-100, 100-500, 500-1000, 1000+), tags.
- **Sort-by options**: total cost, expense count.
- **Calculation options**: average, median.
- **`filterExpensesByDate()`**: Filters expenses by dayjs subtraction.
- **`searchExpenses()`**: Case-insensitive search across vendor, cost, tag.
- **`groupExpenses()`**: Groups expenses into `GroupedExpenses` map with computed totals.

---

### Utility & Constants

#### `src/utility/utility.ts`
- **Purpose**: Shared utility functions.
- **Date functions** (dayjs wrappers): `getDayJs`, `getUnixTimestamp`, `getCurrentDate`, `getDateFormat`, `getDateFromString`, `getDateMonth`, `getDateMonthTime`, `getDateMedJs`, `getDateJsIdFormat`, `getTimeJs`, `getDateToEpoch`, `getISODate`, `getDateTimeSecFromISO`.
- **Sort functions**: `sortByKey`, `sortBy2Key` (descending by object property).
- **`JSONCopy()`**: Deep clone via JSON.parse/stringify.
- **`formatVendorName()`**: Parses vendor strings for UPI pattern (name + UPI ID), returns array.
- **`isEmpty()`**: Null/undefined/empty-string check.
- **`sleep()`**: Promise-based delay.

#### `src/utility/constants.ts`
- **Purpose**: Shared constant values.
- IndexedDB config keys: `EXPENSE_LAST_UPDATE`, `TAG_LAST_UPDATE`, `BUDGET_LAST_UPDATE`, `EMAIL_PARSE_BANKS_CACHE_KEY`.
- `CHART_COLORS`: Array of 14 hex color strings for chart rendering.

#### `src/utility/setupTests.ts`
- Testing setup (Jest DOM matchers).

---

### Styles

#### `src/styles/theme.scss`
- **Purpose**: CSS custom properties (variables) for theming.
- Defines `:root` (light mode) and `[data-theme="dark"]` overrides.
- Variables cover: text colors, background colors, border colors, accent colors (red, blue, purple, green, yellow), subtle accent backgrounds, component-specific colors (search, group boxes, overlays, box-shadows).

#### `src/styles/BootStrap.css`
- Bootstrap utility overrides and customizations.

#### `src/App.scss`
- Global utility classes: flex-center, font sizes, padding, border-radius.
- Tag text styles (red for tagged, purple for untagged).
- Imports theme.scss.

---

### Cloud Functions (Firebase)

#### `functions/index.js`
- **Purpose**: Firebase Cloud Functions v2 (HTTP triggers).
- Uses Firebase Admin SDK with auto-initialized credentials.
- **Endpoints**:

| Function | Method | Purpose |
|---|---|---|
| `addExpenseData` | POST | Writes expense doc to Firestore with date-based key |
| `getOneDoc` | POST | Reads single doc from any collection |
| `setOneDoc` | POST | Writes single doc to any collection |
| `getAllDoc` | POST | Reads all docs from a collection |

- **Authentication**: All endpoints validate Bearer token against `https://oauth2.googleapis.com/tokeninfo`. Token email must match `USER_EMAIL` env var.
- **Date handling**: Uses dayjs with UTC+5:30 (IST) offset for key generation.

#### `functions/package.json`
- Dependencies for Cloud Functions runtime.

---

### Apps Script (Gmail + Gemini)

#### `appScript/expenses.js`
- **Purpose**: Main email parsing and expense extraction logic.
- **`myExpenseFunction()`**: Entry point (runs hourly via trigger).
  - Skips runs outside IST 09:00-22:00 window.
  - Loads bank config and vendor tags from Firestore via Cloud Functions.
  - Lists Gmail messages, processes from last processed ID.
  - For each message: extracts text (snippet + decoded HTML body).
  - Checks if text matches any configured bank's match strings.
  - If matched: sends subject + body text to Gemini API for extraction.
  - Validates Gemini response (retries once if invalid).
  - Creates expense object with auto-tagging from vendor-tag list.
  - Persists via `cloudAddExpense()` Cloud Function.
- **`callGemini()`**: Calls Gemini 3 Flash Preview API with structured prompt. Expects JSON response with `cost`, `costType`, `vendor`, `type`.
- **`validateExpense()`**: Validates Gemini output shape, retries once on failure.
- **`addExpense()`**: Merges validated Gemini data with Gmail metadata, applies vendor tags, calls Cloud Function.

#### `appScript/functions.js`
- **Purpose**: Cloud Function client helpers for Apps Script.
- `cloudAddExpense()`, `setOneDoc()`, `getOneDoc()`, `getAllDoc()`: HTTP POST wrappers using `UrlFetchApp.fetch()`.
- `callCloudFunction()`: Generic Cloud Function caller with Bearer auth.
- Email parsing helpers: `extractEmailAddress()`, `getMailSubject()`, `getMailSenderReceiver()`, `extractUsername()`.
- Gemini validation: `isValidExpenseGeminiShape()`, `normalizeGeminiExpense()`.
- Bank matching: `findEmailParseBankMatch()` (case-insensitive match string lookup).

#### `appScript/utility.js`
- **Purpose**: Email body extraction and HTML parsing.
- `findBody()`: Recursively searches MIME parts for HTML/plain text body.
- `base64Decode()`: Decodes URL-safe Base64 (Gmail format) using `Utilities.newBlob()`.
- `extractPlainTextFromHtml()`: Strips HTML tags, decodes entities, normalizes whitespace.

#### `appScript/trigger.js`
- **Purpose**: Creates hourly time-driven trigger for `myExpenseFunction`.
- Deletes existing triggers to avoid duplicates.

#### `appScript/appsscript.json`
- **Purpose**: Apps Script project configuration.
- Timezone: `Asia/Kolkata`.
- Advanced services: Gmail API v1.
- OAuth scopes: Gmail read-only, external requests, script triggers, user email.
- Runtime: V8.
- Webapp: accessible only by deploying user.

#### `appScript/emailParsingConfig.json`
- **Purpose**: Legacy/reference regex-based parsing config (superseded by Gemini).
- Contains HDFC-specific patterns for credit card, UPI, e-mandate transactions.

#### `appScript/.eslintrc.json`
- ESLint config for Apps Script files.

---

### Build Scripts

#### `scripts/generate-build-info.js`
- **Purpose**: Auto-generates `src/buildInfo.ts` at build time.
- Reads version from `package.json`.
- Writes TypeScript file with `version`, `buildTime` (ISO), `buildTimestamp` (epoch ms).
- Run as pre-build step via `package.json` scripts.

#### `scripts/Gmail.ts`
- Gmail API integration script (development/testing utility).

#### `commands/appScript.sh`
- Shell script for Apps Script deployment commands.

---

### Public Assets

#### `public/index.html`
- HTML template with `#root` mount point for React.

#### `public/manifest.json`
- PWA manifest (app name, icons, theme color).

#### `public/robots.txt`
- Standard robots.txt.

#### `public/logo.png`, `logo_low_res.png`, `logo_high_res.png`, `gemini_logo.png`
- Application logo assets at various resolutions.

#### `public/docs/`
- Architecture diagrams (drawio SVG, dot/SVG dataflow), screenshot images.

---

### GitHub Configuration

#### `.github/workflows/github-pull-request.yml`
- PR workflow (likely lint/build checks).

#### `.github/FUNDING.yml`
- Sponsor/funding configuration.

#### `.github/copilot/instructions.md`
- GitHub Copilot instructions for the project.

#### `.github/commit-convention.md`
- Commit message conventions documentation.

---

## Data Flow

### 1. Initial Load (Authenticated User)
```
Login -> AuthProvider sets currentUser -> ProtectedRoute triggers
  -> loadInitialAppData() called once
    -> Parallel API calls:
       - getVendorTagList() (Firestore + IndexedDB sync)
       - getExpenseList() (Firestore + IndexedDB sync)
       - getBudgetList() (Firestore + IndexedDB sync)
       - getTagList() (Firestore only)
       - getDarkModeConfig() (Firestore only)
    -> Redux store populated via setExpenseState(), setBudgetList(), setTagList()
    -> isAppLoading set to false -> UI renders
```

### 2. Add Expense (Manual)
```
User clicks FAB (+) -> AddExpense dialog opens
  -> User enters cost, selects tag
  -> ExpenseAPI.addExpense() called
    -> Writes to Firestore (key = formatted date + vendor)
    -> Writes to IndexedDB
  -> Redux store updated via updateExpense()
```

### 3. Automated Email Import
```
Apps Script hourly trigger -> myExpenseFunction()
  -> Load bank config from Firestore (via Cloud Function)
  -> List Gmail messages
  -> For each message:
    -> Extract text content
    -> Check against bank match strings
    -> If matched: Send to Gemini API
    -> Validate Gemini response
    -> Apply vendor-tag auto-mapping
    -> Call addExpenseData Cloud Function -> Writes to Firestore
  -> Next time web app syncs: getExpenseList() picks up new expenses
```

### 4. Tag Expense
```
User taps expense row -> TagExpenses dialog opens
  -> User selects tag (+ optional auto-tag toggle)
  -> ExpenseAPI.addExpense(updated expense)
    -> Firestore + IndexedDB updated
  -> If auto-tag enabled: ExpenseAPI.updateVendorTag()
  -> Redux store updated
```

---

## Android Mobile App - Migration Analysis

### Executive Summary

Building an Android app for Pennywise requires porting the React web app's UI and business logic to native Android (Kotlin/Jetpack Compose) or a cross-platform framework (React Native/Flutter). The backend (Firebase Firestore, Cloud Functions, Apps Script) requires **zero changes** since these are already cloud services accessible from any client.

### Recommended Approach: React Native

Given that the existing codebase is React + TypeScript, **React Native** offers the highest code reuse potential:

| Reusable As-Is | Needs Porting | Not Applicable |
|---|---|---|
| All TypeScript interfaces (`Types.ts`) | All React components (JSX -> RN components) | IndexedDB (use AsyncStorage/MMKV) |
| All utility functions (`utility.ts`) | SCSS styles -> StyleSheet/NativeWind | Browser-specific APIs (clipboard, file-saver) |
| Redux store, slices, actions | MUI components -> React Native Paper/Elements | `window.scrollTo`, DOM event listeners |
| `ExpenseAPI.ts` (Firestore logic) | Recharts -> react-native-chart-kit/Victory | HTML rendering in ErrorHandlers |
| `dataValidations.ts` (filter/group logic) | react-router -> react-navigation | `createRoot` portal for error modal |
| Alert actions, constants | Bootstrap grid -> Flexbox | `Suspense` lazy loading (different in RN) |
| dayjs date utilities | Framer Motion -> React Native Reanimated | |

### Detailed Requirements for Android App

#### 1. Authentication
- **Current**: Firebase Auth with `signInWithPopup` (browser popup).
- **Android**: Use `@react-native-firebase/auth` with `GoogleSignin` from `@react-native-google-signin/google-signin`.
- **Effort**: Low. Firebase auth works identically; only the sign-in trigger mechanism changes.

#### 2. Data Layer (Firestore)
- **Current**: `firebase/firestore/lite` SDK with direct collection/doc queries.
- **Android**: Use `@react-native-firebase/firestore` (full SDK, not lite).
- **Changes needed**:
  - Import paths change but API is nearly identical.
  - The `lite` SDK uses `getDocs`, `setDoc`, `deleteDoc` — the full SDK has the same API plus real-time listeners.
  - No architectural changes required.
- **Effort**: Low. Import swaps + minor API adjustments.

#### 3. Local Caching (IndexedDB Replacement)
- **Current**: Raw IndexedDB API via `FinanceIndexDB` class.
- **Android options**:
  - **MMKV** (via `react-native-mmkv`): Fast key-value store. Good for config. Not ideal for querying expense lists.
  - **WatermelonDB**: SQLite-based, supports indexing, querying. Best for the expense/vendorTag stores.
  - **AsyncStorage**: Simple but no querying capability.
  - **SQLite** (via `expo-sqlite` or `react-native-sqlite-storage`): Direct SQL queries.
- **Recommended**: WatermelonDB or SQLite for expenses/vendorTags/budgets, MMKV for config values.
- **Effort**: Medium. Need to rewrite `FinanceIndexDB` class to use new storage API while maintaining the same caching strategy.

#### 4. UI Components Migration

| Web Component | Android Equivalent | Notes |
|---|---|---|
| MUI `Container`, `Box`, `Paper` | `View` with styles | Direct mapping |
| MUI `Typography` | `Text` with styles | Map variant to fontSize/fontWeight |
| MUI `Button`, `IconButton` | `TouchableOpacity`/`Pressable` or React Native Paper `Button` | |
| MUI `TextField` | `TextInput` or Paper `TextInput` | |
| MUI `Chip` | React Native Paper `Chip` or custom | |
| MUI `Dialog` | React Native `Modal` or Paper `Dialog` | |
| MUI `BottomNavigation` | React Navigation `BottomTabNavigator` | Best native equivalent |
| MUI `Fab` | Paper `FAB` | |
| MUI `LinearProgress` | `ProgressBar` or `react-native-progress` | |
| MUI `Switch` | React Native `Switch` | |
| MUI `Avatar` | Paper `Avatar` or custom `Image` in circle | |
| MUI `Alert` (toast) | `react-native-toast-message` or custom | |
| MUI `CircularProgress` | `ActivityIndicator` | |
| MUI `DatePicker` | `react-native-date-picker` or `@react-native-community/datetimepicker` | |
| Recharts (Line/Pie) | `react-native-chart-kit`, `victory-native`, or `react-native-gifted-charts` | |
| Framer Motion | `react-native-reanimated` + `Moti` | |
| Bootstrap Grid (`Row`/`Col`) | Flexbox `View` | React Native uses flexbox natively |
| `react-swipeable` | `react-native-gesture-handler` | |

#### 5. Navigation
- **Current**: React Router DOM v6 with `useNavigate`, `useLocation`, `<Route>`.
- **Android**: React Navigation v6+ with `Stack.Navigator`, `BottomTab.Navigator`.
- **Changes**:
  - Replace `BrowserRouter` with `NavigationContainer`.
  - Replace `<Route>` definitions with `Stack.Screen`.
  - Replace `useNavigate()` with `useNavigation()`.
  - Replace `useLocation()` with `useRoute()`.
  - ProtectedRoute logic moves to navigation auth flow (conditional navigator).
- **Effort**: Medium. Route structure remains the same; API is different.

#### 6. File Export
- **Current**: `exceljs` + `file-saver` + `json-2-csv` for browser downloads.
- **Android**:
  - Use `react-native-fs` for file writing.
  - Use `react-native-share` for sharing exported files.
  - `exceljs` may work in React Native with polyfills, or use `xlsx` library.
  - CSV generation works as-is (pure JS).
- **Effort**: Medium. Need to handle file system permissions and share intent.

#### 7. Theme System
- **Current**: CSS custom properties + MUI `createTheme` + `data-theme` attribute.
- **Android**:
  - Use React Navigation's theme system or React Native Paper's `Provider` theme.
  - Store dark mode preference in MMKV instead of Firestore `config/darkMode`.
  - Map CSS variables to a JS theme object.
- **Effort**: Medium. Theme structure needs redesign for native.

#### 8. Long Press & Gestures
- **Current**: Custom `useLongPress` hook with DOM events.
- **Android**: Use `react-native-gesture-handler`'s `LongPressGestureHandler` or `Pressable`'s `onLongPress`.
- **Effort**: Low. Native gesture handling is simpler than web.

#### 9. Clipboard
- **Current**: `navigator.clipboard.writeText()`.
- **Android**: `@react-native-clipboard/clipboard`.
- **Effort**: Trivial.

#### 10. Push Notifications (New Feature Opportunity)
- Not in web app, but Android enables:
  - Expense reminders
  - Budget alerts (when approaching/exceeding budget)
  - New auto-imported expense notifications
- Use `@react-native-firebase/messaging` for FCM.

#### 11. Offline Support
- **Current**: IndexedDB cache with incremental Firestore sync.
- **Android**: Same strategy with local DB (SQLite/WatermelonDB) + Firestore offline persistence (built into full SDK).
- The full Firestore SDK (not lite) has automatic offline persistence, which is an upgrade over the current web approach.

### Feature Parity Checklist

| Feature | Web Status | Android Effort | Notes |
|---|---|---|---|
| Google Sign-In | Done | Low | Different sign-in flow |
| Expense List (Home) | Done | Medium | Complex UI with grouping/filtering |
| Add Expense | Done | Low | Simple form |
| Tag Expense | Done | Low | Dialog with chips |
| Merge Expenses | Done | Low | Dialog with selections |
| Delete Expenses | Done | Low | API calls + state update |
| Search Expenses | Done | Low | Text filtering logic reusable |
| Date Range Filter | Done | Low | Filter logic reusable |
| Group By | Done | Low | Grouping logic reusable |
| Insights Charts | Done | Medium | Chart library migration |
| Export XLSX/CSV | Done | Medium | File system + share |
| Budget CRUD | Done | Low | Forms + Firestore |
| Budget Progress | Done | Low | Calculation logic reusable |
| Manage Tags | Done | Low | Simple CRUD |
| Manage Vendor Tags | Done | Low | List + edit dialog |
| Manage Banks | Done | Low | List + add dialog |
| Auto-Tag Expenses | Done | Low | API call logic reusable |
| Reload Data | Done | Low | API call + cache clear |
| Dark Mode | Done | Medium | Theme system redesign |
| Profile/Settings | Done | Low | Layout + navigation |
| Bottom Navigation | Done | Low | React Navigation tabs |
| Alerts/Toasts | Done | Low | Toast library |
| Error Handling | Done | Low | Modal approach works |
| Long Press Selection | Done | Low | Native gesture support |
| Offline Caching | Done | Medium | Storage layer rewrite |

### Estimated Development Timeline

| Phase | Duration | Deliverables |
|---|---|---|
| 1. Project Setup | 1 week | React Native project, Firebase config, navigation skeleton, auth flow |
| 2. Data Layer | 1-2 weeks | Firestore integration, local storage (SQLite/WatermelonDB), caching strategy |
| 3. Core Features | 2-3 weeks | Home (expense list), Add/Tag/Merge expenses, search/filter/group |
| 4. Analytics | 1-2 weeks | Insights page, charts, export |
| 5. Budget | 1 week | Budget CRUD, progress tracking |
| 6. Settings | 1 week | All settings sub-pages, theme, profile |
| 7. Polish | 1-2 weeks | Animations, dark mode, error handling, testing |
| 8. Release | 1 week | Play Store listing, signing, CI/CD |
| **Total** | **8-13 weeks** | Full feature parity Android app |

### Alternative: Flutter

If native performance and full platform control is preferred:
- **Pros**: Better performance, single codebase for iOS+Android, strong Firestore integration (`cloud_firestore`).
- **Cons**: No TypeScript code reuse, complete UI rewrite, different state management patterns (Riverpod/BLoC vs Redux).
- **Timeline**: ~12-16 weeks (longer due to zero code reuse).

### Alternative: PWA (Progressive Web App)

The current web app could be enhanced into a PWA as the fastest path to mobile:
- Add service worker for offline support.
- Add `manifest.json` enhancements (already partially done).
- Add install prompts.
- **Timeline**: 1-2 weeks.
- **Limitation**: No Play Store distribution, limited native API access, no push notifications (on iOS).

### Recommendation

**React Native** is the recommended path because:
1. Highest code reuse from existing TypeScript/React codebase.
2. All business logic (filtering, grouping, calculations) ports directly.
3. Redux store and actions port with minimal changes.
4. Firebase ecosystem has excellent React Native support.
5. Single codebase can target both Android and iOS.
6. The team already has React expertise.
