# Pennywise Android App - React Native Migration Plan

## Jira Project Structure

- **Project Key**: `PW`
- **Epic Prefix**: `PW-EPIC`
- **Story Prefix**: `PW`
- **Estimation**: Story Points (1 SP = ~half day of dev effort for a mid-level RN developer)

---

## EPIC 1: Project Foundation & Infrastructure

> **PW-EPIC-01** | Priority: Highest | Total SP: 21
> Set up the React Native project, CI/CD, and foundational architecture that all features depend on.

---

### PW-001: Initialize React Native Project with TypeScript

**Type**: Story | **Priority**: Highest | **SP**: 3 | **Sprint**: 1

**Description**:
Create a new React Native project using the React Native CLI (not Expo) with TypeScript template. Configure the project structure to mirror the web app's organization.

**Acceptance Criteria**:
- [ ] React Native project initialized with TypeScript (`npx react-native init Pennywise --template react-native-template-typescript`)
- [ ] Directory structure created:
  ```
  src/
    api/
    components/
    firebase/
    hooks/
    pages/
      home/
      login/
      insights/
      budget/
      setting/
    store/
    styles/
    utility/
  ```
- [ ] ESLint + Prettier configured matching web app conventions
- [ ] `.editorconfig` ported (2-space indent, LF, UTF-8)
- [ ] App runs on Android emulator with a blank screen

**Technical Notes**:
- Minimum Android SDK: 24 (Android 7.0) for broad device coverage
- Target SDK: 34 (latest)
- Use React Native 0.76+ for New Architecture support

---

### PW-002: Port TypeScript Interfaces & Constants

**Type**: Story | **Priority**: Highest | **SP**: 1 | **Sprint**: 1

**Description**:
Copy and adapt the shared TypeScript types and constants from the web app. These are platform-agnostic and port with zero or minimal changes.

**Acceptance Criteria**:
- [ ] `src/Types.ts` ported as-is (Expense, VendorTag, Alert, BankConfig, BankEmailParsingEntry, Config, AppConfig, Budget, BudgetProgress, MonthYear)
- [ ] `src/utility/constants.ts` ported as-is (EXPENSE_LAST_UPDATE, TAG_LAST_UPDATE, BUDGET_LAST_UPDATE, EMAIL_PARSE_BANKS_CACHE_KEY, CHART_COLORS)
- [ ] All interfaces compile without errors in RN project

**Source Files**:
- `src/Types.ts` -> copy directly
- `src/utility/constants.ts` -> copy directly

---

### PW-003: Port Utility Functions

**Type**: Story | **Priority**: Highest | **SP**: 1 | **Sprint**: 1

**Description**:
Port `utility.ts` functions. All are pure TypeScript/dayjs with no DOM dependencies, so they port as-is.

**Acceptance Criteria**:
- [ ] All dayjs functions ported: `getDayJs`, `getUnixTimestamp`, `getCurrentDate`, `getDateFormat`, `getDateFromString`, `getDateMonth`, `getDateMonthTime`, `getDateMedJs`, `getDateJsIdFormat`, `getTimeJs`, `getDateToEpoch`, `getISODate`, `getDateTimeSecFromISO`
- [ ] Sort functions ported: `sortByKey`, `sortBy2Key`
- [ ] `JSONCopy`, `formatVendorName`, `isEmpty`, `sleep` ported
- [ ] `dayjs` + `customParseFormat` + `localizedFormat` plugins installed and configured
- [ ] Unit tests written for `formatVendorName` (UPI pattern parsing) and `filterExpensesByDate`

**Source Files**:
- `src/utility/utility.ts` -> copy directly, remove any window/DOM references

---

### PW-004: Configure Firebase for React Native

**Type**: Story | **Priority**: Highest | **SP**: 3 | **Sprint**: 1

**Description**:
Set up Firebase SDKs for React Native. The web app uses `firebase/firestore/lite` (REST-based). React Native uses `@react-native-firebase` which is the native SDK with offline persistence built-in.

**Acceptance Criteria**:
- [ ] `@react-native-firebase/app` installed and configured
- [ ] `@react-native-firebase/firestore` installed (full SDK, not lite)
- [ ] `@react-native-firebase/auth` installed
- [ ] `google-services.json` added to `android/app/` (from Firebase Console)
- [ ] Firebase initializes on app launch without errors
- [ ] Firestore reads/writes work from RN (test with a simple doc read)

**Technical Notes**:
- Web uses `firebase/firestore/lite` (no offline cache). RN gets offline persistence for free from the native SDK.
- `google-services.json` must NOT be committed to git; add to `.gitignore` and document setup.
- The same Firebase project is shared between web and mobile.

**Dependencies**: None

---

### PW-005: Set Up Redux Toolkit Store

**Type**: Story | **Priority**: Highest | **SP**: 2 | **Sprint**: 1

**Description**:
Port the Redux store configuration. The Redux layer is platform-agnostic and ports with minimal changes.

**Acceptance Criteria**:
- [ ] `@reduxjs/toolkit` and `react-redux` installed
- [ ] `src/store/store.ts` ported as-is
- [ ] `src/store/expenseSlice.ts` ported — remove `FinanceIndexDB.addVendorTag()` call from `setTagMap` reducer (side effect in reducer is an anti-pattern; will be handled in action layer)
- [ ] `src/store/expenseActions.ts` ported as-is
- [ ] `src/store/alertActions.ts` ported — replace `crypto.randomUUID()` with `uuid` library (already a dependency)
- [ ] Redux Provider wraps root component
- [ ] Redux DevTools configured for development (via `react-native-debugger` or Flipper plugin)

**Source Files**:
- `src/store/store.ts` -> copy
- `src/store/expenseSlice.ts` -> copy, remove IndexedDB side effect
- `src/store/expenseActions.ts` -> copy
- `src/store/alertActions.ts` -> copy, swap UUID generation

---

### PW-006: Implement Local Storage Layer (Replace IndexedDB)

**Type**: Story | **Priority**: Highest | **SP**: 5 | **Sprint**: 1-2

**Description**:
Replace `FinanceIndexDB` (browser IndexedDB) with a React Native equivalent. The web app uses IndexedDB with 4 object stores: `expense` (keyPath: `mailId`, indexes: `vendor`, `date`), `vendorTag` (keyPath: `vendor`), `config` (keyPath: `key`), `budget` (keyPath: `id`).

**Acceptance Criteria**:
- [ ] SQLite database created using `react-native-sqlite-storage` or `op-sqlite`
- [ ] 4 tables matching IndexedDB stores:
  ```sql
  CREATE TABLE expense (
    mailId TEXT PRIMARY KEY,
    id TEXT,
    tag TEXT,
    cost REAL,
    costType TEXT,
    date INTEGER,
    modifiedDate INTEGER,
    user TEXT,
    type TEXT,
    vendor TEXT,
    operation TEXT
  );
  CREATE INDEX idx_expense_vendor ON expense(vendor);
  CREATE INDEX idx_expense_date ON expense(date);

  CREATE TABLE vendorTag (
    vendor TEXT PRIMARY KEY,
    id TEXT,
    tag TEXT,
    date INTEGER
  );

  CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE budget (
    id TEXT PRIMARY KEY,
    name TEXT,
    amount REAL,
    tagList TEXT,  -- JSON serialized string[]
    modifiedDate INTEGER,
    operation TEXT
  );
  ```
- [ ] `LocalDB` class created with same public API as `FinanceIndexDB`:
  - `initDB()` — create tables if not exist
  - `addExpenseList(expenses)` — batch upsert
  - `addVendorTag(vendorTag)` — upsert single
  - `addConfig(configList)` — batch upsert
  - `addBudgetList(budgets)` — batch upsert
  - `getData(table, key)` — get by primary key
  - `getAllData(table)` — get all rows
  - `deleteExpense(mailId)` — delete by key
  - `deleteBudget(budgetId)` — delete by key
  - `clearLocalDBData()` — drop and recreate all tables
- [ ] All methods return the same types as `FinanceIndexDB`
- [ ] Unit tests for each CRUD operation

**Technical Notes**:
- Budget `tagList` is `string[]` in TypeScript but stored as JSON string in SQLite. Serialize on write, deserialize on read.
- Use transactions for batch inserts for performance.
- Consider `MMKV` (via `react-native-mmkv`) for the `config` table since it's simple key-value, but keeping it in SQLite is simpler for consistency.

---

### PW-007: Port ExpenseAPI Data Layer

**Type**: Story | **Priority**: Highest | **SP**: 5 | **Sprint**: 2

**Description**:
Port `ExpenseAPI.ts` from `firebase/firestore/lite` to `@react-native-firebase/firestore`. The API signatures stay the same; the Firestore SDK calls change syntax.

**Acceptance Criteria**:
- [ ] All static methods ported from `ExpenseAPI`:
  - `addExpense(expense, operation)` — Firestore write + LocalDB write
  - `deleteExpense(expense)` — Firestore delete + LocalDB delete
  - `getExpenseList(overrideLastDate?)` — incremental sync: query `modifiedDate >= lastUpdate`, merge into LocalDB, return full list
  - `getTagList()` / `updateTagList(tags)` — config/tags CRUD
  - `getBankConfig()` / `updateBankConfig(config)` — config/bankConfig CRUD
  - `getDarkModeConfig()` / `updateDarkMode(val)` — config/darkMode CRUD
  - `getVendorTagList()` — incremental sync for vendorTag collection
  - `updateVendorTag(vendorTag)` / `deleteVendorTag(id)` — vendorTag CRUD
  - `autoTagPastExpenses(startDate)` — batch auto-tag with 700-item batches and 1.5s delays
  - `getEmailParseBankList()` / `updateEmailParseBankList(banks)` — write-through cache
  - `addBudget()` / `updateBudget()` / `deleteBudget()` / `getBudgetList()` — budget CRUD with incremental sync
- [ ] Caching strategy preserved: lastUpdate timestamps in LocalDB config table, query Firestore for `modifiedDate >= lastUpdate`, merge results, return full local list
- [ ] Error handling calls to `ErrorHandler` (equivalent of web's `ErrorHandlers.handleApiError`)
- [ ] `fireStoreDoc` utility object (set/get/delete) ported with RN Firestore syntax

**SDK Migration Map**:
| Web (firebase/firestore/lite) | RN (@react-native-firebase/firestore) |
|---|---|
| `doc(db, collection, key)` | `firestore().collection(name).doc(key)` |
| `setDoc(docRef, data)` | `docRef.set(data)` |
| `getDoc(docRef)` -> `snap.data()` | `docRef.get()` -> `snap.data()` |
| `deleteDoc(docRef)` | `docRef.delete()` |
| `getDocs(query(...))` | `collection.where(...).get()` |
| `query(collection(db, name), where(...))` | `firestore().collection(name).where(...)` |

**Dependencies**: PW-004, PW-006

---

### PW-008: Port Business Logic (dataValidations)

**Type**: Story | **Priority**: High | **SP**: 1 | **Sprint**: 2

**Description**:
Port `dataValidations.ts` — all filtering, searching, grouping, and initial data loading logic. This is pure TypeScript with dayjs, no DOM dependencies.

**Acceptance Criteria**:
- [ ] `loadInitialAppData()` ported — parallel API calls for vendorTags, expenses, budgets, tagList, darkMode
- [ ] `filterExpensesByDate()` ported with all DateRange options (1d through 1800d)
- [ ] `searchExpenses()` ported — case-insensitive search across vendor, cost, tag
- [ ] `groupExpenses()` ported — grouping by days, vendor, cost ranges (₹0-100, ₹100-500, ₹500-1000, ₹1000+), tags
- [ ] All types exported: `DateRange`, `GroupByOption`, `SortByOption`, `CalculationOption`, `GroupedExpenses`
- [ ] All option arrays exported: `filterOptions`, `groupByOptions`, `sortByOptions`, `calculationOptions`

**Source Files**:
- `src/pages/dataValidations.ts` -> copy directly, update import paths

---

---

## EPIC 2: Authentication

> **PW-EPIC-02** | Priority: Highest | Total SP: 8
> Implement Google Sign-In and auth state management for the mobile app.

---

### PW-009: Implement Google Sign-In

**Type**: Story | **Priority**: Highest | **SP**: 5 | **Sprint**: 2

**Description**:
Replace Firebase Auth `signInWithPopup` (browser-only) with native Google Sign-In for Android. The web uses `AuthService.ts` and `AuthContext.tsx`.

**Acceptance Criteria**:
- [ ] `@react-native-google-signin/google-signin` installed and configured
- [ ] SHA-1 fingerprint added to Firebase Console for Android app
- [ ] `AuthService.ts` ported:
  - `signInWithGoogle()` — uses `GoogleSignin.signIn()` -> `auth().signInWithCredential(googleCredential)`
  - `signOut()` — clears local DB via `LocalDB.clearLocalDBData()`, then `auth().signOut()` + `GoogleSignin.revokeAccess()`
  - `getCurrentUser()` — returns `auth().currentUser`
  - `onAuthStateChanged(callback)` — wraps `auth().onAuthStateChanged(callback)`
- [ ] Sign-in flow works end-to-end on Android device/emulator
- [ ] Sign-out clears all local data and returns to login screen

**Technical Notes**:
- Web uses `signInWithPopup` which opens a browser popup. Android uses native Google Sign-In dialog.
- `webClientId` from `google-services.json` must be passed to `GoogleSignin.configure()`.
- Debug and release builds need different SHA-1 fingerprints in Firebase Console.

---

### PW-010: Port Auth Context & Hook

**Type**: Story | **Priority**: Highest | **SP**: 3 | **Sprint**: 2

**Description**:
Port `AuthContext.tsx` and `useAuth.ts` hook for React Native. The context pattern is identical; only the Firebase Auth import paths change.

**Acceptance Criteria**:
- [ ] `AuthContext.tsx` ported:
  - `AuthProvider` wraps app, manages `currentUser` state via `onAuthStateChanged`
  - `useAuth()` hook returns `currentUser`, `loading`, `signInWithGoogle`, `signOut`
  - Children rendered only after auth state determined (loading=false)
- [ ] `useAuth.ts` hook ported:
  - Returns `userProfile` (name, email, photoUrl, uid), `currentUser`, `isLoading`, `signOut`
  - `signOut()` clears LocalDB, reinitializes DB, then signs out from Firebase
  - `photoUrl` from `currentUser.photoURL` (Google profile picture)
- [ ] Auth state persists across app restarts (Firebase Auth handles this natively)
- [ ] Protected screens not accessible without authentication

**Dependencies**: PW-009

---

---

## EPIC 3: Navigation & App Shell

> **PW-EPIC-03** | Priority: Highest | Total SP: 8
> Set up React Navigation and the core app shell (bottom tabs, protected routes, theming).

---

### PW-011: Set Up React Navigation

**Type**: Story | **Priority**: Highest | **SP**: 3 | **Sprint**: 2

**Description**:
Replace React Router DOM v6 with React Navigation v6. The web app has a flat route structure with a bottom nav and protected routes.

**Acceptance Criteria**:
- [ ] `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack` installed
- [ ] Required peer deps installed: `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`
- [ ] Navigation structure:
  ```
  NavigationContainer
  ├── AuthStack (Stack.Navigator) — shown when NOT authenticated
  │   └── LoginScreen
  └── AppStack (BottomTab.Navigator) — shown when authenticated
      ├── Home (Stack.Navigator)
      │   └── HomeScreen
      ├── Stats (Stack.Navigator)
      │   └── InsightsScreen
      ├── Budget (Stack.Navigator)
      │   ├── BudgetScreen
      │   └── EditBudgetScreen
      └── Profile (Stack.Navigator)
          ├── SettingsScreen
          ├── ManageTagsScreen
          ├── ManageVendorTagsScreen
          ├── ReloadDataScreen
          ├── AutoTagExpensesScreen
          ├── ManageBanksScreen
          └── ConfigurationScreen
  ```
- [ ] Auth-based conditional rendering: `AuthStack` when `currentUser` is null, `AppStack` when authenticated
- [ ] `loadInitialAppData()` called once when switching to `AppStack`

**Technical Notes**:
- Web uses `ProtectedRoute` component that checks auth and redirects. RN uses conditional navigator rendering (simpler pattern).
- Web has 10 routes. RN nests settings sub-pages under the Profile tab stack.

---

### PW-012: Implement Bottom Tab Navigation

**Type**: Story | **Priority**: Highest | **SP**: 2 | **Sprint**: 2

**Description**:
Port `BottomNav.tsx` to React Navigation's `BottomTabNavigator`. Web uses MUI `BottomNavigation` with 4 tabs.

**Acceptance Criteria**:
- [ ] 4 bottom tabs matching web: Home, Stats, Budget, Profile
- [ ] Icons matching web: Home, BarChart/Insights, AccountBalanceWallet/Budget, Person/Profile
- [ ] Active tab highlighted with theme accent color
- [ ] Tab bar styled to match web app's appearance (background color, text color from theme)
- [ ] Tab bar hidden on Login screen (via `tabBarStyle: { display: 'none' }` or conditional navigator)
- [ ] Tab icons use `react-native-vector-icons/MaterialIcons` or `@expo/vector-icons`

**Source File**: `src/components/BottomNav.tsx`

---

### PW-013: Implement Theme System

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 2

**Description**:
Port the CSS custom properties theme system to React Native. Web uses SCSS variables in `:root` and `[data-theme="dark"]`. RN needs a JS-based theme.

**Acceptance Criteria**:
- [ ] Theme object created with all variables from `theme.scss`:
  ```typescript
  const lightTheme = {
    textPrimary: '#212529',
    textSecondary: '#495057',
    textMuted: '#6c757d',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fa',
    bgTertiary: '#e9ecef',
    bgCard: '#ffffff',
    bgCardHeader: '#f1f3f5',
    borderColor: '#dee2e6',
    accentRed: '#ca1919',
    accentBlue: '#1c75bd',
    accentPurple: 'rgb(48, 73, 214)',
    accentGreen: '#23ad29',
    // ... all 30+ variables
  };
  ```
- [ ] `darkTheme` object with all dark mode overrides from `theme.scss`
- [ ] `ThemeContext` provider that exposes current theme + toggle function
- [ ] Theme preference synced with Redux `appConfig.darkMode` and Firestore `config/darkMode`
- [ ] `useAppTheme()` hook that returns current theme object
- [ ] React Navigation theme configured (background, card, text, border colors)
- [ ] System dark mode detection via `useColorScheme()` as initial default
- [ ] Status bar color changes with theme (dark status bar on light theme, light on dark)

**Source File**: `src/styles/theme.scss` (map all variables to JS objects)

---

---

## EPIC 4: Core Screens - Home & Expense Management

> **PW-EPIC-04** | Priority: Highest | Total SP: 25
> Implement the Home screen (expense list) and all expense CRUD operations.

---

### PW-014: Implement Login Screen

**Type**: Story | **Priority**: Highest | **SP**: 2 | **Sprint**: 3

**Description**:
Port `Login.tsx` — simple screen with Pennywise logo and Google Sign-In button.

**Acceptance Criteria**:
- [ ] Pennywise logo displayed centered (use logo.png from web assets)
- [ ] App name "Pennywise" displayed
- [ ] "Sign in with Google" button that triggers `signInWithGoogle()`
- [ ] Loading state while sign-in is in progress
- [ ] Error message displayed on sign-in failure
- [ ] Navigates to Home screen on successful sign-in
- [ ] Light/dark theme aware background and text colors

**Source File**: `src/pages/login/Login.tsx`

---

### PW-015: Implement Home Screen - Expense List

**Type**: Story | **Priority**: Highest | **SP**: 8 | **Sprint**: 3

**Description**:
Port `Home.tsx` — the most complex screen (~810 lines). Shows grouped expense list with search, filtering, and grouping. Uses `FlatList`/`SectionList` instead of DOM-based scrolling.

**Acceptance Criteria**:
- [ ] **Header**: Page title "Expenses"
- [ ] **Search Bar**: Text input with search icon, filters expenses by vendor/cost/tag using `searchExpenses()`
- [ ] **Filter Chips**: Date range filter button showing current selection, opens filter panel
- [ ] **Filter Panel**: Bottom sheet or modal with date range options (1d through All Time) as selectable chips. Uses `filterOptions` from `dataValidations.ts`
- [ ] **Group-By Panel**: Bottom sheet with group options (Days, Vendor, Tags, Cost) + sort options (Total Cost, Expenses Count). Uses `groupByOptions` and `sortByOptions`
- [ ] **Grouped List**: `SectionList` with:
  - Section headers showing: group label, expense count, total amount (₹)
  - Collapsible sections (tap header to toggle)
  - Collapse/expand all button in header
- [ ] **Expense Row** (per item):
  - Left: Avatar with payment type icon (CreditCard for credit, CurrencyRupee for debit)
  - Center: Vendor name (formatted via `formatVendorName()`), date (via `getDateMonth()`)
  - Right: Cost with ₹ prefix, tag chip (colored: red if tagged, purple if untagged)
  - Tap to open TagExpenses modal (via `setTagExpense()` Redux action)
- [ ] **Loading state**: `ActivityIndicator` while `isAppLoading` is true
- [ ] **Empty state**: "No expenses found" message when filtered list is empty
- [ ] **Scroll-to-top**: Button appears after scrolling down, scrolls `SectionList` to top
- [ ] **FAB**: Floating action button (+) at bottom-right, opens AddExpense dialog

**Technical Notes**:
- Web uses `window.scrollTo` and scroll event listeners. RN uses `SectionList.scrollToLocation()` and `onScroll` prop.
- Web uses `reactstrap` `Row`/`Col` for layout. RN uses `View` with `flexDirection: 'row'`.
- Web uses CSS classes. RN uses `StyleSheet.create()`.
- Performance: Use `React.memo` on expense row component, `getItemLayout` for fixed-height rows.

**Source File**: `src/pages/home/Home.tsx`

**Dependencies**: PW-007, PW-008

---

### PW-016: Implement Long-Press Selection Mode

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 3

**Description**:
Port the long-press multi-select feature from Home. Web uses custom `useLongPress` hook with mouse/touch events. RN has native `onLongPress` support.

**Acceptance Criteria**:
- [ ] Long-press on any expense row enters selection mode
- [ ] Selection mode UI:
  - Header changes to show: selected count, close (X) button
  - Action buttons: Delete (trash icon), Merge (merge icon)
  - Each expense row shows a checkbox/checkmark overlay
- [ ] Tap expense in selection mode toggles selection
- [ ] Close button exits selection mode and clears selections
- [ ] Selection state stored in component state: `selectedExpenses: Expense[]`

**Technical Notes**:
- Web's `useLongPress` hook (500ms delay, 10px movement threshold) is replaced by RN's `Pressable` `onLongPress` prop (default 500ms) or `react-native-gesture-handler`'s `LongPressGestureHandler`.
- Movement threshold to distinguish from scroll: RN `Pressable` handles this natively with `delayLongPress`.

**Source File**: `src/hooks/useLongPress.ts`, `src/pages/home/Home.tsx` (selection mode logic)

---

### PW-017: Implement Add Expense Dialog

**Type**: Story | **Priority**: Highest | **SP**: 2 | **Sprint**: 3

**Description**:
Port `AddExpense.tsx` — modal dialog to manually create a new expense.

**Acceptance Criteria**:
- [ ] Modal/bottom sheet with:
  - Cost input: numeric keyboard, ₹ prefix
  - Tag selection: horizontal scrollable chip list from Redux `tagList`
  - Cancel and Save buttons
- [ ] On save:
  - Generates `mailId` via `uuid.v4()`
  - Sets vendor as `<random> manual entry`
  - Sets `costType` as `'debit'` (default)
  - Sets `date` as `Date.now()`
  - Calls `ExpenseAPI.addExpense()`
  - Updates Redux store via `updateExpense()` action
  - Shows success alert
  - Closes dialog
- [ ] Validation: cost must be > 0
- [ ] Keyboard dismisses on submit

**Source File**: `src/pages/home/home-views/AddExpense.tsx`

---

### PW-018: Implement Tag Expense Dialog

**Type**: Story | **Priority**: Highest | **SP**: 3 | **Sprint**: 3

**Description**:
Port `TagExpenses.tsx` — global modal for tagging/re-tagging expenses. In web, this is controlled by Redux `isTagModal` and rendered in `App.tsx`.

**Acceptance Criteria**:
- [ ] Modal triggered by Redux `isTagModal` state (same pattern as web)
- [ ] Modal shows:
  - Vendor name (formatted via `formatVendorName()`)
  - If UPI vendor: UPI ID displayed with copy-to-clipboard button
  - Date (formatted via `getDateMonthTime()`)
  - Cost with ₹ prefix
  - Current tag (if any)
  - "Auto tag future transactions" toggle switch
  - Tag selection: chip list from Redux `tagList`, currently selected tag highlighted
- [ ] On save:
  - Updates expense tag via `ExpenseAPI.addExpense(updatedExpense)`
  - If auto-tag enabled: creates vendor-tag mapping via `ExpenseAPI.updateVendorTag()`
  - Updates Redux via `updateExpense()` and `setTagMap()` actions
  - Closes modal via `hideTagExpense()` action
- [ ] Copy UPI ID to clipboard using `@react-native-clipboard/clipboard`

**Source File**: `src/pages/home/home-views/TagExpenses.tsx`

---

### PW-019: Implement Merge Expenses Dialog

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 3

**Description**:
Port `MergeExpenses.tsx` — dialog to merge multiple selected expenses into one.

**Acceptance Criteria**:
- [ ] Dialog receives `selectedExpenses: Expense[]` as prop
- [ ] Shows:
  - Count of selected expenses
  - Calculated total cost (sum with debit/credit awareness)
  - Vendor selection: dropdown/picker from unique vendors across selected
  - Tag selection: chip list from Redux `tagList`
- [ ] On merge:
  - Soft-deletes original expenses (sets `operation: 'delete'`, calls `ExpenseAPI.addExpense` for each)
  - Creates new merged expense via `ExpenseAPI.addExpense()`
  - Updates Redux via `mergeSaveExpense()` action
  - Exits selection mode
  - Shows success alert with count
- [ ] Cancel button closes dialog without changes

**Source File**: `src/pages/home/home-views/MergeExpenses.tsx`

---

### PW-020: Implement Delete Expenses Flow

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 3

**Description**:
Implement single and bulk expense deletion from the Home screen.

**Acceptance Criteria**:
- [ ] **Single delete**: Swipe-to-delete on expense row (using `react-native-gesture-handler` Swipeable) OR long-press context menu
- [ ] **Bulk delete**: Delete button in selection mode header
- [ ] Confirmation dialog before deletion (Alert.alert or custom modal)
- [ ] On delete:
  - Calls `ExpenseAPI.deleteExpense(expense)` for each selected expense
  - Removes from Redux via `deleteExpense()` action
  - Shows success alert
  - If in selection mode: exits selection mode
- [ ] Loading indicator during deletion

**Dependencies**: PW-015, PW-016

---

### PW-021: Implement Pull-to-Refresh

**Type**: Story | **Priority**: High | **SP**: 1 | **Sprint**: 3

**Description**:
Add pull-to-refresh to the Home expense list. Web has a manual "reload" in settings; mobile should have native pull-to-refresh.

**Acceptance Criteria**:
- [ ] `SectionList` `refreshControl` prop configured
- [ ] Pull-to-refresh triggers `ExpenseAPI.getExpenseList()` and updates Redux store
- [ ] Refresh indicator shows while loading
- [ ] Same refresh available on Budget and Insights screens

**Technical Notes**:
- New feature not in web app — native mobile UX pattern.
- Web's reload is in Settings > Reload Data. Mobile should have both: pull-to-refresh for convenience, full reload in settings for cache clear.

---

### PW-022: Port useCloseOnOutsideClick Hook

**Type**: Story | **Priority**: Low | **SP**: 1 | **Sprint**: 3

**Description**:
Replace the web's `useCloseOnOutsideClick` hook (DOM mousedown + scroll listeners) with a React Native equivalent for closing filter/group-by panels.

**Acceptance Criteria**:
- [ ] If using bottom sheets (`@gorhom/bottom-sheet`): built-in backdrop dismiss handles this
- [ ] If using custom overlays: `TouchableWithoutFeedback` wrapper that calls `onClose` when backdrop is tapped
- [ ] Filter and group-by panels close when tapping outside them

**Technical Notes**:
- Web listens to `mousedown` on document and `scroll` on window. RN uses backdrop press or bottom sheet's `onClose` callback.
- Consider using `@gorhom/bottom-sheet` for all filter/group panels — it handles dismiss gestures natively.

---

---

## EPIC 5: Insights & Charts

> **PW-EPIC-05** | Priority: High | Total SP: 13
> Implement the analytics/insights screen with charts and data export.

---

### PW-023: Implement Insights Screen - Statistics Cards

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 4

**Description**:
Port the top section of `Insights.tsx` — summary statistics cards showing total spending, daily/monthly averages, and medians.

**Acceptance Criteria**:
- [ ] **Summary Cards** (horizontal scrollable row):
  - Total Spending (₹)
  - Daily Average (₹) with up/down trend icon
  - Daily Median (₹)
  - Monthly Average (₹)
  - Monthly Median (₹)
- [ ] Cards styled with gradient backgrounds matching web (use `react-native-linear-gradient`)
- [ ] Average vs Median toggle (calculation option chips)
- [ ] Date range filter at top (same chip-based filter as Home)
- [ ] Group-by selector (Days, Vendor, Tags, Cost)
- [ ] All calculations performed using existing `filterExpensesByDate()` and `groupExpenses()` functions
- [ ] Formatted with INR currency (Intl.NumberFormat or manual ₹ prefix)

**Source File**: `src/pages/insights/Insights.tsx` (lines 1-200 approx)

---

### PW-024: Implement Line Chart

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 4

**Description**:
Port `LineGraph` component from Recharts to a React Native charting library. Shows daily spending trends.

**Acceptance Criteria**:
- [ ] Chart library installed: `react-native-gifted-charts` or `victory-native`
- [ ] Line chart displays when group-by is "Days"
- [ ] X-axis: dates (formatted DD MMM)
- [ ] Y-axis: amount (₹)
- [ ] Multiple lines when multiple items selected (one per selected group)
- [ ] Colors from `CHART_COLORS` constant
- [ ] Rolling 7-day smoothing calculation (matches web logic)
- [ ] Touch tooltip showing date and value
- [ ] Theme-aware: axis labels, grid lines, and tooltip use theme colors
- [ ] Empty state when no data

**Source File**: `src/pages/insights/Graph.tsx` (LineGraph component)

---

### PW-025: Implement Pie Chart

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 4

**Description**:
Port `PieGraph` component. Shows distribution when grouped by vendor/tags/cost.

**Acceptance Criteria**:
- [ ] Donut-style pie chart (inner radius for center label)
- [ ] Displayed when group-by is Vendor, Tags, or Cost
- [ ] Each slice labeled with ₹ amount
- [ ] Colors from `CHART_COLORS` constant
- [ ] Legend showing group labels with color indicators
- [ ] Optional: selection toggle to show/hide specific groups from chart
- [ ] Touch interaction: tap slice to highlight and show details
- [ ] Theme-aware colors

**Source File**: `src/pages/insights/Graph.tsx` (PieGraph component)

---

### PW-026: Implement Item Selection Panel

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 4

**Description**:
Port the item selection panel from Insights. Allows users to choose which grouped items appear in the chart.

**Acceptance Criteria**:
- [ ] Bottom sheet or expandable panel showing all grouped items
- [ ] Each item has: color indicator, label, total amount, checkbox
- [ ] Select/deselect items to show/hide them from the chart
- [ ] "Select All" / "Deselect All" toggle
- [ ] Chart updates in real-time as selections change

---

### PW-027: Implement Report Export (XLSX/CSV)

**Type**: Story | **Priority**: Medium | **SP**: 3 | **Sprint**: 4

**Description**:
Port `exportReport.ts` — export filtered expense data as XLSX or CSV files. Web uses file-saver for browser download; mobile uses file system + share sheet.

**Acceptance Criteria**:
- [ ] Export buttons on Insights screen (XLSX and CSV)
- [ ] **XLSX export**:
  - Use `xlsx` library (lighter than exceljs for RN) or `exceljs` with Buffer polyfill
  - Styled headers matching web (bold, colored)
  - Columns: Date, Vendor, Cost, Type, Tag
  - File saved to device's Downloads directory
- [ ] **CSV export**:
  - Use `json-2-csv` (pure JS, works in RN)
  - Same columns as XLSX
- [ ] After file creation:
  - Show share sheet via `react-native-share` so user can send via email/WhatsApp/etc.
  - OR show success toast with file location
- [ ] Filename format: `pennywise_expenses_YYYY-MM-DD.xlsx/csv`
- [ ] Handle storage permissions for Android 10+ (scoped storage via MediaStore or SAF)

**Technical Notes**:
- `file-saver` is browser-only. Use `react-native-fs` to write files.
- `exceljs` requires `Buffer` polyfill in RN. Consider `xlsx` (SheetJS) as a lighter alternative.
- Android 13+ doesn't need WRITE_EXTERNAL_STORAGE permission if writing to app-specific or Downloads directory.

**Source File**: `src/pages/insights/exportReport.ts`

---

---

## EPIC 6: Budget Management

> **PW-EPIC-06** | Priority: High | Total SP: 8
> Implement budget tracking with progress visualization.

---

### PW-028: Implement Budget Overview Screen

**Type**: Story | **Priority**: High | **SP**: 5 | **Sprint**: 5

**Description**:
Port `Budget.tsx` — shows budget cards with progress bars, month filter, and add button.

**Acceptance Criteria**:
- [ ] **Budget Cards** (vertical scrollable list):
  - Budget name
  - Budget amount (₹, formatted via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`)
  - Progress bar: green (<85%), yellow (85-100%), red (>100%)
  - Spent and Remaining amounts
  - Percentage label
  - Tag chips showing linked tags
  - Tap card to open Edit Budget screen
- [ ] **Month Filter**: Filter button showing current month, opens bottom sheet
  - Year selector: current year, last 2 years
  - Month grid: Jan-Dec (limited to current month for current year)
  - Selecting a month filters expenses and recalculates progress
- [ ] **Add Budget FAB**: Floating button opens EditBudget as "create" mode
- [ ] **Budget progress calculation** (`calculateBudgetProgress`):
  - "All" tag: sums all debit expenses for the month
  - Specific tags: sums debit expenses matching any tag in budget's `tagList`
  - Remaining = max(0, amount - spent)
  - Percentage = (spent / amount) * 100
- [ ] **Empty state**: "No budget data available" when no budgets exist
- [ ] **Animations**: Card entry animations using `react-native-reanimated` (matching Framer Motion staggered fade-in from web)

**Source File**: `src/pages/budget/Budget.tsx`

**Dependencies**: PW-007, PW-008

---

### PW-029: Implement Edit Budget Screen

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 5

**Description**:
Port `EditBudget.tsx` — modal/screen for creating and editing budgets.

**Acceptance Criteria**:
- [ ] **Create mode** (budget prop is null):
  - Title: "Add Budget"
  - Empty form fields
  - Save button creates budget via `ExpenseAPI.addBudget()`
  - Updates Redux via `addBudget()` action
- [ ] **Edit mode** (budget prop exists):
  - Title: "Edit Budget"
  - Fields pre-populated from existing budget
  - Save button updates via `ExpenseAPI.updateBudget()`
  - Updates Redux via `updateBudget()` action
  - Delete button with confirmation, calls `ExpenseAPI.deleteBudget()`, Redux `deleteBudget()`
- [ ] **Form fields**:
  - Budget name: text input
  - Amount: numeric input with ₹ prefix
  - Tag selection: multi-select chips from Redux `tagList` + special "All" option
- [ ] **Validation**:
  - Name not empty
  - Amount > 0
  - At least one tag selected
- [ ] Success/error alerts via `createTimedAlert()`

**Source File**: `src/pages/budget/EditBudget.tsx`

---

---

## EPIC 7: Settings & Profile

> **PW-EPIC-07** | Priority: High | Total SP: 14
> Implement all settings screens and user profile.

---

### PW-030: Implement Settings Screen

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 5

**Description**:
Port `Settings.tsx` — profile card + dashboard tiles for navigation to settings sub-screens.

**Acceptance Criteria**:
- [ ] **Profile Card**:
  - User avatar (Google profile photo with fallback icon)
  - User name
  - User email
  - Card styled with subtle elevation/shadow
- [ ] **Dashboard Tiles** (vertical list):
  | Tile | Action | Icon Color |
  |---|---|---|
  | Tags | Navigate to ManageTags | #ce93d8 |
  | Dark/Light Theme | Toggle theme inline | #9c27b0 |
  | Reload Data | Navigate to ReloadData | #ffa726 |
  | Manage Vendor Tags | Navigate to ManageVendorTags | #64b5f6 |
  | Auto-tag Expenses | Navigate to AutoTagExpenses | #4db6ac |
  | Banks | Navigate to ManageBanks | #26a69a |
  | Sign Out | Trigger sign-out flow | #f44336 |
- [ ] Each tile: icon avatar (colored background), title, subtitle, divider, tap handler
- [ ] Animated tile entry (staggered fade-in matching web's Framer Motion)
- [ ] **Version display**: "Pennywise v1.1.0" at bottom, tappable
- [ ] **App Info Modal**: Shows version, build time (IST), author, GitHub link

**Source Files**: `src/pages/setting/Settings.tsx`, `src/components/DashboardTile.tsx`, `src/components/ProfileAvatar.tsx`

---

### PW-031: Implement Manage Tags Screen

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 5

**Description**:
Port `ManageTags.tsx` — CRUD for expense tag labels.

**Acceptance Criteria**:
- [ ] Tags displayed as chip cloud (flex-wrap layout)
- [ ] Each chip has delete (X) button
- [ ] **Add tag**: Button opens dialog with text input. On save: adds to Redux `tagList` via `addTag()`, persists via `ExpenseAPI.updateTagList()`
- [ ] **Delete tag**: Tap X on chip shows confirmation dialog. On confirm: removes from Redux via `deleteTag()`, persists via `ExpenseAPI.updateTagList()`
- [ ] Tags sorted alphabetically
- [ ] Duplicate tag prevention (case-insensitive check)

**Source File**: `src/pages/setting/setting-views/ManageTags.tsx`

---

### PW-032: Implement Manage Vendor Tags Screen

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 5

**Description**:
Port `ManageVendorTags.tsx` — manage vendor-to-tag auto-mapping rules.

**Acceptance Criteria**:
- [ ] **Search bar**: Filter vendor-tag list by vendor name
- [ ] **List items**: Each row shows vendor name and mapped tag
- [ ] **Edit**: Tap row opens dialog with:
  - Vendor name (read-only display)
  - Tag selection chips from Redux `tagList`
  - Save button calls `ExpenseAPI.updateVendorTag()`
- [ ] **Delete**: Delete button on each row with confirmation dialog. Calls `ExpenseAPI.deleteVendorTag()`
- [ ] List sorted alphabetically by vendor name
- [ ] Vendor-tag list from Redux `vendorTagList`

**Source File**: `src/pages/setting/setting-views/ManageVendorTags.tsx`

---

### PW-033: Implement Reload Data Screen

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 6

**Description**:
Port `ReloadData.tsx` — data reload and cache clear utilities.

**Acceptance Criteria**:
- [ ] **Section 1 - Reload by Date**:
  - Date picker (native Android date picker via `@react-native-community/datetimepicker`)
  - Reload button: calls `ExpenseAPI.getExpenseList(selectedDateEpoch)`, updates Redux
  - Loading indicator during reload
- [ ] **Section 2 - Reload All**:
  - Warning text about potential Firebase billing
  - Reload All button: calls `ExpenseAPI.getExpenseList(getUnixTimestamp('2020-01-01'))`, updates Redux
  - Confirmation dialog before executing
- [ ] **Section 3 - Clear Local Cache**:
  - Description text explaining what happens
  - Clear Cache button: calls `LocalDB.clearLocalDBData()`, then `LocalDB.initDB()`
  - Success alert on completion

**Source File**: `src/pages/setting/setting-views/ReloadData.tsx`

---

### PW-034: Implement Auto-Tag Expenses Screen

**Type**: Story | **Priority**: Medium | **SP**: 1 | **Sprint**: 6

**Description**:
Port `AutoTagExpenses.tsx` — batch auto-tagging based on vendor-tag mappings.

**Acceptance Criteria**:
- [ ] **Section 1 - Tag by Date**:
  - Date picker for start date
  - "Auto Tag" button: calls `ExpenseAPI.autoTagPastExpenses(startDateEpoch)`
  - Shows success count on completion
- [ ] **Section 2 - Tag All**:
  - "Auto Tag All" button: calls `ExpenseAPI.autoTagPastExpenses(getUnixTimestamp('2020-01-01'))`
  - Shows success count
- [ ] Info banner explaining that auto-tagging uses existing vendor-tag mappings
- [ ] Loading indicator during batch operation (can take several seconds for large datasets due to 700-item batches with 1.5s delays)
- [ ] After completion: reload expense list to reflect new tags

**Source File**: `src/pages/setting/setting-views/AutoTagExpenses.tsx`

---

### PW-035: Implement Manage Banks Screen

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 6

**Description**:
Port `ManageBanks.tsx` — configure banks for Gmail email parsing (used by Apps Script).

**Acceptance Criteria**:
- [ ] **Bank list**: Each entry shows display name and match strings count
- [ ] **Add bank dialog**:
  - Display name text input
  - Match strings: multiline text input (comma or newline separated)
  - Save button: adds to list, calls `ExpenseAPI.updateEmailParseBankList()`
- [ ] **Delete bank**: Tap bank shows confirmation dialog. On confirm: removes from list, persists
- [ ] Data loaded via `ExpenseAPI.getEmailParseBankList()` on mount
- [ ] Empty state: "No banks configured" message

**Source File**: `src/pages/setting/setting-views/ManageBanks.tsx`

---

### PW-036: Implement Bank Configuration Screen

**Type**: Story | **Priority**: Low | **SP**: 2 | **Sprint**: 6

**Description**:
Port `Configuration.tsx` — legacy bank account settings (UPI toggle, credit cards).

**Acceptance Criteria**:
- [ ] **UPI Toggle**: Switch for enabling/disabling HDFC UPI tracking
- [ ] **Credit Cards**: Add/remove last-4-digits credit card entries
  - Add: text input limited to 4 digits
  - Delete: tap card chip to remove
- [ ] Data loaded from `ExpenseAPI.getBankConfig()` on mount
- [ ] Changes saved via `ExpenseAPI.updateBankConfig()`

**Source File**: `src/pages/setting/setting-views/Configuration.tsx`

---

---

## EPIC 8: Shared Components & UX Polish

> **PW-EPIC-08** | Priority: High | Total SP: 10
> Implement reusable components, global UI elements, and platform-specific polish.

---

### PW-037: Implement Global Alert/Toast System

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 3

**Description**:
Port `Alert.tsx` — global toast notification system. Web renders stacked MUI Alerts from Redux state. Mobile should use a toast library.

**Acceptance Criteria**:
- [ ] Install `react-native-toast-message` or implement custom toast component
- [ ] Toasts triggered by Redux `alerts` state (same mechanism as web)
- [ ] Support 4 types: success (green), error (red), info (blue), warning (yellow)
- [ ] Auto-dismiss after timeout (default 3000ms, same as web's `createTimedAlert`)
- [ ] Manual dismiss via swipe or close button
- [ ] Multiple toasts stack (most recent on top)
- [ ] Toasts appear below status bar, above all other content

**Source Files**: `src/components/Alert.tsx`, `src/store/alertActions.ts`

---

### PW-038: Implement Error Handler

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 3

**Description**:
Port `ErrorHandlers.tsx` — global API error handling with access-denied modal.

**Acceptance Criteria**:
- [ ] `handleApiError(error)` function:
  - Detects 401/403/permission-denied Firebase errors
  - Shows access-denied modal/alert
- [ ] Access-denied modal:
  - "Access Denied" title
  - "Your session has expired" message
  - "Sign In Again" button that triggers sign-out + navigate to login
- [ ] Non-auth errors: log to console (or future crash reporting)
- [ ] Function callable from `ExpenseAPI` methods (same pattern as web)

**Source File**: `src/components/ErrorHandlers.tsx`

**Technical Notes**:
- Web uses `createRoot` to mount a portal modal. RN should use a global modal component rendered in the root navigator, controlled by a ref or context.

---

### PW-039: Implement Loading Component

**Type**: Story | **Priority**: High | **SP**: 0.5 | **Sprint**: 3

**Description**:
Port `Loading.tsx` — centered loading spinner.

**Acceptance Criteria**:
- [ ] Centered `ActivityIndicator` (large size)
- [ ] Theme-aware color (accent color from theme)
- [ ] Full-screen overlay variant for blocking operations
- [ ] Inline variant for within-content loading

**Source File**: `src/components/Loading.tsx`

---

### PW-040: Implement Animations

**Type**: Story | **Priority**: Medium | **SP**: 3 | **Sprint**: 6

**Description**:
Port Framer Motion animations to React Native Reanimated + Moti.

**Acceptance Criteria**:
- [ ] Install `react-native-reanimated` (already needed for navigation) and `moti`
- [ ] **Dashboard tiles**: Staggered fade-in on Settings screen (matching `containerVariants` with `staggerChildren: 0.05`)
- [ ] **Budget cards**: Fade-in + slide-up on mount (matching `initial={{opacity: 0, y: 20}}`)
- [ ] **Budget progress bars**: Scale-X animation from 0 to value
- [ ] **List items**: Fade-in as they enter viewport (or on mount with stagger)
- [ ] **FAB**: Zoom-in entrance animation
- [ ] **Filter/group panels**: Slide-up with backdrop fade
- [ ] All animations respect `reducedMotion` system setting via `useReducedMotion()` hook

**Source Files**: Various — grep for `motion.div`, `AnimatePresence`, `initial`, `animate`, `transition` in web codebase

---

### PW-041: Implement Haptic Feedback

**Type**: Story | **Priority**: Low | **SP**: 0.5 | **Sprint**: 6

**Description**:
Add haptic feedback for key interactions — a native mobile enhancement not in the web app.

**Acceptance Criteria**:
- [ ] Install `react-native-haptic-feedback`
- [ ] Light haptic on: long-press activation, expense selection toggle, expense deletion
- [ ] Medium haptic on: budget over-limit visual trigger
- [ ] Haptic respects system haptic settings (disabled when system vibration is off)

---

### PW-042: Implement Splash Screen & App Icon

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 6

**Description**:
Configure Android splash screen and app icon using Pennywise's existing logo assets.

**Acceptance Criteria**:
- [ ] **App icon**: Generate all required density sizes (mdpi through xxxhdpi) from `logo_high_res.png`
  - Adaptive icon with foreground and background layers
  - Round icon variant
- [ ] **Splash screen**: Use `react-native-bootsplash` or `react-native-splash-screen`
  - Pennywise logo centered on themed background
  - Smooth transition to app content (no flash of white)
  - Duration: until Firebase Auth state is determined
- [ ] App name in launcher: "Pennywise"

**Assets**: `public/logo.png`, `public/logo_high_res.png`

---

---

## EPIC 9: Testing & Quality

> **PW-EPIC-09** | Priority: High | Total SP: 10
> Unit tests, integration tests, and end-to-end testing.

---

### PW-043: Unit Tests - Business Logic

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 5

**Description**:
Write unit tests for all platform-agnostic business logic that was ported from the web app.

**Acceptance Criteria**:
- [ ] Jest configured for React Native
- [ ] Tests for `dataValidations.ts`:
  - `filterExpensesByDate()` with each DateRange option
  - `searchExpenses()` with vendor, cost, and tag search terms
  - `groupExpenses()` for each GroupByOption (days, vendor, cost, tags)
  - Cost range grouping boundaries (₹0-100, ₹100-500, ₹500-1000, ₹1000+)
- [ ] Tests for `utility.ts`:
  - `formatVendorName()` with regular names, UPI format, and "manual entry"
  - `isEmpty()` with null, undefined, empty, whitespace
  - Date formatting functions
  - Sort functions
- [ ] Tests for `alertActions.ts`:
  - `createTimedAlert()` generates ID and auto-removes
- [ ] Tests for `expenseSlice.ts` reducers:
  - Each reducer action tested with sample state

---

### PW-044: Unit Tests - Data Layer

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 5

**Description**:
Write unit tests for the LocalDB and ExpenseAPI layers.

**Acceptance Criteria**:
- [ ] LocalDB tests (using in-memory SQLite):
  - `initDB()` creates all tables
  - `addExpenseList()` batch inserts expenses
  - `getData()` retrieves by key
  - `getAllData()` returns all rows
  - `deleteExpense()` removes by mailId
  - `clearLocalDBData()` drops all data
- [ ] ExpenseAPI tests (mocked Firestore):
  - Incremental sync logic (lastUpdate timestamp check)
  - `addExpense()` writes to both Firestore and LocalDB
  - `deleteExpense()` removes from both
  - Budget CRUD operations
  - Auto-tag batch processing

---

### PW-045: Integration Tests - Auth Flow

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 6

**Description**:
Integration tests for the authentication flow.

**Acceptance Criteria**:
- [ ] Test: unauthenticated user sees Login screen
- [ ] Test: sign-in navigates to Home screen
- [ ] Test: sign-out clears local data and shows Login screen
- [ ] Test: expired token triggers access-denied modal
- [ ] Test: app restart with valid session skips login

---

### PW-046: E2E Tests - Critical User Flows

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 6

**Description**:
End-to-end tests for critical user journeys using Detox or Maestro.

**Acceptance Criteria**:
- [ ] Framework configured: Detox or Maestro
- [ ] Test: Login -> View expenses -> Add expense -> Verify in list
- [ ] Test: Login -> Tag expense -> Verify tag updated
- [ ] Test: Login -> Create budget -> Verify progress card shown
- [ ] Test: Login -> Settings -> Manage Tags -> Add tag -> Verify
- [ ] Tests run in CI pipeline

---

---

## EPIC 10: Build, Release & CI/CD

> **PW-EPIC-10** | Priority: High | Total SP: 8
> Production build configuration, signing, CI/CD pipeline, and Play Store release.

---

### PW-047: Configure Android Build Variants

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 6

**Description**:
Set up debug and release build configurations for Android.

**Acceptance Criteria**:
- [ ] `build.gradle` configured with:
  - `debug` build type: debuggable, dev Firebase config
  - `release` build type: minified (ProGuard/R8), signed, production Firebase config
- [ ] App versioning:
  - `versionName` from `package.json` (matches web app)
  - `versionCode` auto-incremented per build
- [ ] Build info generation script adapted from web's `scripts/generate-build-info.js`
- [ ] Environment variable management: separate `.env.debug` and `.env.release` (via `react-native-config`)
- [ ] APK and AAB (Android App Bundle) output verified

---

### PW-048: Configure App Signing

**Type**: Story | **Priority**: High | **SP**: 1 | **Sprint**: 6

**Description**:
Set up release signing for Play Store distribution.

**Acceptance Criteria**:
- [ ] Keystore generated for release signing
- [ ] Keystore credentials stored securely (not in git)
- [ ] `build.gradle` signingConfigs for release
- [ ] Signed APK/AAB builds successfully
- [ ] SHA-1 and SHA-256 fingerprints added to Firebase Console

---

### PW-049: Set Up CI/CD Pipeline

**Type**: Story | **Priority**: High | **SP**: 3 | **Sprint**: 6

**Description**:
Set up automated build and test pipeline using GitHub Actions.

**Acceptance Criteria**:
- [ ] GitHub Actions workflow:
  - **On PR**: lint, type-check, unit tests
  - **On merge to main**: lint, type-check, unit tests, build debug APK
  - **On tag/release**: build signed AAB, upload to Play Store (internal track)
- [ ] Secrets configured: keystore, Firebase credentials, Play Store service account
- [ ] Build artifacts (APK/AAB) saved as workflow artifacts
- [ ] Build status badge in README

**Source Reference**: `.github/workflows/github-pull-request.yml` (adapt web's PR workflow)

---

### PW-050: Play Store Listing & First Release

**Type**: Story | **Priority**: High | **SP**: 2 | **Sprint**: 7

**Description**:
Create Play Store listing and publish first release.

**Acceptance Criteria**:
- [ ] Google Play Console account set up
- [ ] Store listing:
  - App name: "Pennywise"
  - Short description: "Personal finance tracker with automated email import"
  - Full description: adapted from web README
  - Screenshots: 4+ from phone, 2+ from tablet (if applicable)
  - Feature graphic (1024x500)
  - App icon (512x512) from logo_high_res.png
  - Category: Finance
  - Content rating: completed questionnaire
  - Privacy policy URL
- [ ] Internal testing track release (first)
- [ ] Closed beta release
- [ ] Production release

---

---

## EPIC 11: Mobile-Only Enhancements (Post-Launch)

> **PW-EPIC-11** | Priority: Medium | Total SP: 10
> Native mobile features not present in the web app. Scheduled for post-launch sprints.

---

### PW-051: Push Notifications for Budget Alerts

**Type**: Story | **Priority**: Medium | **SP**: 3 | **Sprint**: 8

**Description**:
New feature — send push notifications when budget thresholds are crossed.

**Acceptance Criteria**:
- [ ] `@react-native-firebase/messaging` configured for FCM
- [ ] Local notifications via `@notifee/react-native` or `react-native-push-notification`
- [ ] Notification triggers:
  - Budget reaches 85% (warning)
  - Budget reaches 100% (over-budget alert)
- [ ] Notification settings screen: enable/disable per budget
- [ ] Notifications checked on each expense sync

---

### PW-052: Biometric Authentication

**Type**: Story | **Priority**: Medium | **SP**: 2 | **Sprint**: 8

**Description**:
Add fingerprint/face unlock as optional security layer.

**Acceptance Criteria**:
- [ ] Install `react-native-biometrics` or `expo-local-authentication`
- [ ] Optional setting in Profile: "Require biometric to open app"
- [ ] When enabled: biometric prompt on app foreground (from background)
- [ ] Fallback to PIN/pattern if biometric fails
- [ ] Setting stored in local preferences (not Firestore — device-specific)

---

### PW-053: Widget - Monthly Spending Summary

**Type**: Story | **Priority**: Low | **SP**: 3 | **Sprint**: 9

**Description**:
Android home screen widget showing current month's spending.

**Acceptance Criteria**:
- [ ] Widget shows: "₹X,XXX spent this month"
- [ ] Updates periodically (every 30 minutes) or on expense sync
- [ ] Tap widget opens Pennywise app to Insights screen
- [ ] Widget theme matches system dark/light mode
- [ ] Implement using `react-native-android-widget` or native Android widget code

---

### PW-054: Expense Quick-Add from Notification

**Type**: Story | **Priority**: Low | **SP**: 2 | **Sprint**: 9

**Description**:
Quick-add expense from a persistent or scheduled notification.

**Acceptance Criteria**:
- [ ] Daily reminder notification at configurable time (e.g., 9 PM)
- [ ] Notification action: "Add Expense" opens AddExpense dialog directly
- [ ] Reminder time configurable in Settings
- [ ] Can be disabled entirely

---

---

## Sprint Plan Summary

| Sprint | Duration | Epics | Key Deliverables |
|---|---|---|---|
| Sprint 1 | 2 weeks | EPIC 1 (partial) | Project setup, types, utilities, Firebase, Redux, LocalDB |
| Sprint 2 | 2 weeks | EPIC 1 (complete), EPIC 2, EPIC 3 | ExpenseAPI, Auth, Navigation, Theme |
| Sprint 3 | 2 weeks | EPIC 4, EPIC 8 (partial) | Home screen, CRUD, alerts, error handling |
| Sprint 4 | 2 weeks | EPIC 5 | Insights, charts, export |
| Sprint 5 | 2 weeks | EPIC 6, EPIC 7 (partial), EPIC 9 (partial) | Budget, Settings, unit tests |
| Sprint 6 | 2 weeks | EPIC 7 (complete), EPIC 8 (complete), EPIC 9 (complete), EPIC 10 (partial) | Settings sub-pages, animations, E2E tests, CI/CD |
| Sprint 7 | 1 week | EPIC 10 (complete) | Play Store release |
| Sprint 8-9 | 2-4 weeks | EPIC 11 | Push notifications, biometrics, widgets |

---

## Dependency Graph

```
PW-001 (Init Project)
  ├── PW-002 (Types) ──┐
  ├── PW-003 (Utilities)├── PW-008 (Business Logic) ──┐
  ├── PW-004 (Firebase) ┤                              ├── PW-015 (Home Screen)
  ├── PW-005 (Redux)    ├── PW-007 (ExpenseAPI) ───────┤   ├── PW-016 (Long Press)
  └── PW-006 (LocalDB) ─┘                              │   ├── PW-017 (Add Expense)
                                                        │   ├── PW-018 (Tag Expense)
  PW-004 (Firebase)                                     │   ├── PW-019 (Merge)
  └── PW-009 (Google Sign-In)                           │   └── PW-020 (Delete)
      └── PW-010 (Auth Context)                         │
          └── PW-011 (Navigation)                       ├── PW-023-027 (Insights)
              └── PW-012 (Bottom Tabs)                  ├── PW-028-029 (Budget)
              └── PW-013 (Theme)                        └── PW-030-036 (Settings)
              └── PW-014 (Login Screen)

  PW-037-042 (Components) — parallel with feature screens
  PW-043-046 (Testing) — after features stabilize
  PW-047-050 (Release) — after all features complete
  PW-051-054 (Enhancements) — post-launch
```

---

## Technology Choices Summary

| Concern | Library | Why |
|---|---|---|
| Framework | React Native CLI (not Expo) | Full native module control needed for Firebase |
| Firebase | `@react-native-firebase/*` | Official native SDK, best performance, offline support |
| Navigation | React Navigation v6 | Industry standard for RN, deep linking support |
| State | Redux Toolkit | Direct port from web, no migration cost |
| Local Storage | `react-native-sqlite-storage` | Replaces IndexedDB, supports indexes and queries |
| Charts | `react-native-gifted-charts` | Performant, customizable, active maintenance |
| Animations | `react-native-reanimated` + `moti` | Replaces Framer Motion, 60fps on UI thread |
| Icons | `react-native-vector-icons` (MaterialIcons) | Matches web's MUI icons |
| Date Picker | `@react-native-community/datetimepicker` | Native Android date picker |
| Haptics | `react-native-haptic-feedback` | Native vibration patterns |
| File System | `react-native-fs` | File export (XLSX/CSV) |
| Share | `react-native-share` | Share exported files |
| Clipboard | `@react-native-clipboard/clipboard` | UPI ID copy |
| Splash Screen | `react-native-bootsplash` | Fast, no flash |
| Toast | `react-native-toast-message` | Replaces MUI Alert toasts |
| Bottom Sheet | `@gorhom/bottom-sheet` | Filter/group panels |
| Google Sign-In | `@react-native-google-signin/google-signin` | Replaces signInWithPopup |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Firestore SDK differences cause data inconsistency | High | Same collections/documents, same data shape. Write integration tests comparing web and mobile reads. |
| Chart library doesn't support all Recharts features | Medium | Spike chart libraries in Sprint 1. Fallback: `victory-native` or custom SVG. |
| IndexedDB -> SQLite migration misses edge cases | Medium | Mirror exact API surface of `FinanceIndexDB`. Run same test scenarios. |
| Google Sign-In SHA-1 misconfiguration | Low | Document setup steps. Test on multiple devices. |
| Large expense lists cause performance issues | Medium | Use `SectionList` with `getItemLayout`, `React.memo`, and `windowSize` tuning. |
| ExcelJS doesn't work in RN (Buffer dependency) | Low | Use `xlsx` (SheetJS) instead — lighter, pure JS. |
| App size too large | Low | Enable ProGuard, use Hermes engine, analyze with `react-native-bundle-visualizer`. |

---

## Total Estimation

| Metric | Value |
|---|---|
| Total Epics | 11 |
| Total Stories | 54 |
| Total Story Points | 135 |
| Sprints (feature complete) | 7 (14 weeks) |
| Sprints (with enhancements) | 9 (18 weeks) |
| Recommended Team | 1-2 React Native developers |
