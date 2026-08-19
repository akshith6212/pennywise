# Pennywise Mobile - Migration Progress Tracker

**Last Updated**: 2026-08-20
**Total Files Created**: 40
**Total Source Lines (TypeScript)**: ~2,622 (src/ only)

---

## EPIC 1: Project Foundation & Infrastructure — COMPLETE

### PW-001: Initialize React Native Project with TypeScript — DONE

**Files Created**:
- `mobile/package.json` — 25 production deps, 12 dev deps (RN 0.76, Firebase, Navigation, Redux, SQLite, etc.)
- `mobile/tsconfig.json` — Extends `@react-native/typescript-config`, strict mode, path aliases
- `mobile/babel.config.js` — RN preset + Reanimated plugin
- `mobile/metro.config.js` — Default Metro bundler config
- `mobile/app.json` — App name "PennywiseMobile", display name "Pennywise"
- `mobile/.eslintrc.js` — Extends `@react-native` preset
- `mobile/.editorconfig` — 2-space indent, LF, UTF-8 (matches web)
- `mobile/.gitignore` — node_modules, android build artifacts, env files, google-services.json
- `mobile/index.js` — App registry entry point
- `mobile/App.tsx` — Root component (updated in Epic 3)

**Key Decisions**:
- React Native CLI over Expo — required for `@react-native-firebase` native modules
- Node >= 18 (web requires >= 22, but RN toolchain supports 18+)
- `react-native-reanimated` plugin added to Babel for animation support

---

### PW-002: Port TypeScript Interfaces & Constants — DONE

**Files Created**:
- `mobile/src/Types.ts` — All 10 interfaces ported as-is: Expense, VendorTag, Alert, BankConfig, BankEmailParsingEntry, Config, AppConfig, Budget, BudgetProgress, MonthYear
- `mobile/src/utility/constants.ts` — All 5 constants + CHART_COLORS array (14 colors)

**Changes from Web**: None. Fully platform-agnostic.

---

### PW-003: Port Utility Functions — DONE

**Files Created**:
- `mobile/src/utility/utility.ts` — 16 functions ported

**Changes from Web**:
- `isEmpty()` return type narrowed to type guard (`str is null | undefined`) for better TS inference
- All dayjs functions, sort functions, `JSONCopy`, `formatVendorName`, `sleep` — zero changes

---

### PW-004: Configure Firebase for React Native — DONE

**Files Created**:
- `mobile/src/firebase/firebaseConfig.ts` — Exports `firebaseAuth` and `firebaseFirestore` from `@react-native-firebase`

**Changes from Web**:
- Web uses `firebase` JS SDK with env vars for config. RN uses `@react-native-firebase` which reads config from `google-services.json` (Android) automatically.
- No Firebase config object needed in code — it's in the native layer.
- Auth and Google Sign-In logic moved to `AuthService.ts` (Epic 2) to avoid circular deps.

**Setup Required by Developer**:
1. Download `google-services.json` from Firebase Console
2. Place in `mobile/android/app/`
3. Add SHA-1 fingerprint (debug + release) to Firebase Console
4. Set `webClientId` in `AuthService.ts` from `google-services.json` `client[0].oauth_client` where `client_type === 3`

---

### PW-005: Set Up Redux Toolkit Store — DONE

**Files Created**:
- `mobile/src/store/store.ts` — `configureStore` with `expenseSlice`, serializable check disabled
- `mobile/src/store/expenseSlice.ts` — All 18 reducers ported
- `mobile/src/store/expenseActions.ts` — All 16 action dispatchers ported
- `mobile/src/store/alertActions.ts` — `createTimedAlert` + `removeAlert`

**Changes from Web**:
- `expenseSlice.ts`: Removed `FinanceIndexDB.addVendorTag()` side effect from `setTagMap` reducer (was an anti-pattern — side effects belong in thunks/action creators, not reducers). Vendor tag persistence now handled by `ExpenseAPI.updateVendorTag()` at the call site.
- `expenseSlice.ts`: **Fixed bug** in `deleteExpense` reducer — web used `.slice(expenseIndex, 1)` which doesn't remove elements (should be `.splice()`). Replaced with `.filter()` for correct behavior.
- `alertActions.ts`: Replaced `crypto.randomUUID()` (not available in RN Hermes) with `uuid.v4()`.

---

### PW-006: Implement Local Storage Layer (SQLite) — DONE

**Files Created**:
- `mobile/src/api/LocalDB.ts` — Complete SQLite wrapper replacing `FinanceIndexDB`

**Architecture**:
| Web (IndexedDB) | Mobile (SQLite) |
|---|---|
| `indexedDB.open('Finance', 5)` | `SQLite.openDatabase({name: 'Finance.db'})` |
| Object stores with keyPath | Tables with PRIMARY KEY |
| `store.put(item)` | `INSERT OR REPLACE INTO ...` |
| `store.get(key)` | `SELECT * FROM ... WHERE key = ?` |
| `store.getAll()` | `SELECT * FROM ...` |
| `store.delete(key)` | `DELETE FROM ... WHERE key = ?` |
| `indexedDB.deleteDatabase()` | `DELETE FROM` all 4 tables |

**Key Design Decisions**:
- Budget `tagList` (string[]) stored as JSON string in SQLite, auto-deserialized on read
- Config values that look numeric are auto-parsed to `number` on read (matches web behavior)
- All batch operations use SQLite transactions for performance
- Indexes created on `expense.vendor` and `expense.date` (matching web's IndexedDB indexes)
- API surface identical to `FinanceIndexDB` for drop-in compatibility with `ExpenseAPI`

---

### PW-007: Port ExpenseAPI Data Layer — DONE

**Files Created**:
- `mobile/src/api/ExpenseAPI.ts` — All 20+ static methods ported

**SDK Migration Applied**:
| Web (firebase/firestore/lite) | Mobile (@react-native-firebase/firestore) |
|---|---|
| `doc(db, 'expense', key)` | `firestore().collection('expense').doc(key)` |
| `setDoc(docRef, data)` | `docRef.set(data)` |
| `getDoc(docRef)` → `snap.data()` | `docRef.get()` → `snap.data()` |
| `deleteDoc(docRef)` | `docRef.delete()` |
| `getDocs(query(collection(...), where(...)))` | `collection.where(...).get()` |

**Changes from Web**:
- All `FinanceIndexDB` calls replaced with `LocalDB` calls (same API, SQLite backend)
- `ErrorHandlers.handleApiError()` calls replaced with `console.error` + re-throw pattern (ErrorHandlers ported separately in Epic 8)
- Same incremental sync pattern preserved: `modifiedDate >= lastUpdate`, merge into local, return full local list
- Same write-through cache pattern for email parse banks config

---

### PW-008: Port Business Logic (dataValidations) — DONE

**Files Created**:
- `mobile/src/pages/dataValidations.ts` — All exports ported

**Changes from Web**:
- `filterExpensesByDate()`: Replaced verbose switch statement with lookup map (`daysMap`) — same behavior, 60% less code
- `loadInitialAppData()`: Changed `alert(res1)` error handler to `console.error` (no `window.alert` in RN)
- All types, option arrays, and `groupExpenses()` logic — zero changes

---

## EPIC 2: Authentication — COMPLETE

### PW-009: Implement Google Sign-In (AuthService) — DONE

**Files Created**:
- `mobile/src/pages/login/AuthService.ts`

**Web → Mobile Auth Flow**:
```
Web:  signInWithPopup(auth, googleProvider) → User
      ↓
RN:   GoogleSignin.signIn() → idToken
      → auth.GoogleAuthProvider.credential(idToken)
      → auth().signInWithCredential(credential) → User
```

**Key Changes**:
- `signInWithPopup` (browser popup) → `GoogleSignin.signIn()` (native Android dialog)
- Sign-out: Added `GoogleSignin.revokeAccess()` to fully clear Google session on device
- Sign-out: Clears SQLite via `LocalDB.clearLocalDBData()` + reinitializes DB (matches web's IndexedDB clear)
- `GoogleSignin.configure()` placed in module scope — called once on import
- `hasPlayServices()` check added before sign-in (Android-specific requirement)

---

### PW-010: Port Auth Context & useAuth Hook — DONE

**Files Created**:
- `mobile/src/pages/login/AuthContext.tsx` — React Context provider
- `mobile/src/hooks/useAuth.ts` — Standalone auth hook

**Changes from Web**:
- `AuthContext.tsx`: `User` type changed from `firebase/auth` `User` to `FirebaseAuthTypes.User` (RN Firebase). Otherwise identical pattern.
- `useAuth.ts`: Removed `useNavigate()` dependency — web uses `navigate('/login')` for redirect on sign-out, but RN uses conditional navigator rendering (user becomes null → AuthStack renders automatically). No imperative redirect needed.
- `useAuth.ts`: `FinanceIndexDB.clearIndexedDBData()` → `LocalDB.clearLocalDBData()` + `LocalDB.initDB()`

---

## EPIC 3: Navigation & App Shell — COMPLETE

### PW-011: Set Up React Navigation — DONE

**Files Created**:
- `mobile/src/navigation/types.ts` — Full type definitions for all navigators
- `mobile/src/navigation/AppNavigator.tsx` — Root navigator with auth-conditional rendering
- `mobile/src/navigation/ProfileStack.tsx` — Profile tab's nested stack (7 screens)
- `mobile/src/pages/login/LoginScreen.tsx` — Full login screen implementation

**Navigation Structure**:
```
AppNavigator (conditional)
├── AuthStack (when currentUser === null)
│   └── LoginScreen
└── AppTabs (when currentUser !== null)
    ├── Home tab → HomeStack
    │   └── HomeScreen (placeholder)
    ├── Stats tab → StatsStack
    │   └── InsightsScreen (placeholder)
    ├── Budget tab → BudgetStack
    │   └── BudgetScreen (placeholder)
    └── Profile tab → ProfileStack
        ├── SettingsScreen (placeholder)
        ├── ManageTagsScreen (placeholder)
        ├── ManageVendorTagsScreen (placeholder)
        ├── ReloadDataScreen (placeholder)
        ├── AutoTagExpensesScreen (placeholder)
        ├── ManageBanksScreen (placeholder)
        └── ConfigurationScreen (placeholder)
```

**Web → Mobile Navigation**:
| Web (React Router) | Mobile (React Navigation) |
|---|---|
| `<BrowserRouter>` | `<NavigationContainer>` |
| `<Route path="/home">` | `<Stack.Screen name="HomeMain">` |
| `<Navigate to="/login">` | Conditional navigator (no redirect) |
| `useNavigate()` | `useNavigation()` |
| `useLocation().pathname` | `useRoute().name` |
| `<ProtectedRoute>` | Auth-conditional rendering in `RootNavigator` |

**Key Design Decisions**:
- `ProtectedRoute` pattern replaced with conditional navigator rendering — when `currentUser` is null, only `AuthStack` renders. When authenticated, `AppTabs` renders. This is the idiomatic React Navigation pattern.
- `loadInitialAppData()` called via `useEffect` in `RootNavigator` when user authenticates + `isAppLoading` is true. Uses `useRef` to prevent duplicate calls.
- `loadInitialAppData` ref resets when user signs out (currentUser becomes null).
- Settings sub-pages nested under Profile tab stack — no need for top-level routes like web.

---

### PW-012: Implement Bottom Tab Navigation — DONE

**Files Created**:
- `mobile/src/navigation/AppTabs.tsx` — Bottom tab navigator with 4 tabs

**Tab Configuration**:
| Tab | Icon (MaterialIcons) | Stack | Web Equivalent |
|---|---|---|---|
| Home | `home` | HomeStack | `/home` |
| Stats | `analytics` | StatsStack | `/stats` |
| Budget | `account-balance-wallet` | BudgetStack | `/budget` |
| Profile | `person` | ProfileStack | `/profile` |

**Changes from Web**:
- Web uses MUI `BottomNavigation` + `BottomNavigationAction` with `useLocation` to sync active tab to URL. RN tab navigator handles active state automatically.
- Tab bar styled with theme colors: active = `accentBlue`, inactive = `textMuted`, background = `bgCard`, border = `borderColor`.
- Tab bar height: 60px with padding for Android nav bar clearance.
- Each tab wraps its screen in a `NativeStackNavigator` so sub-screens can push onto the stack while keeping the tab bar visible.

---

### PW-013: Implement Theme System — DONE

**Files Created**:
- `mobile/src/styles/theme.ts` — Theme objects, context, hook, and navigation theme bridge

**Architecture**:
- Web uses CSS custom properties (`:root` / `[data-theme="dark"]`). RN uses JS theme objects passed via React Context.
- All 30+ CSS variables from `theme.scss` mapped to TypeScript `AppTheme` interface properties.
- `ThemeContext` created with React `createContext`, provided in `AppNavigator`.
- `useAppTheme()` hook — equivalent of reading CSS variables, used by all screens.
- `getNavigationTheme()` bridges `AppTheme` to React Navigation's `Theme` type.
- Theme selection driven by Redux `appConfig.darkMode` (same as web).
- Status bar style auto-switches: `dark-content` for light theme, `light-content` for dark theme.

**Theme Variable Mapping** (sample):
| CSS Variable | JS Property | Light | Dark |
|---|---|---|---|
| `--text-primary` | `textPrimary` | `#212529` | `#e0e0e0` |
| `--bg-primary` | `bgPrimary` | `#ffffff` | `#181a1b` |
| `--accent-blue` | `accentBlue` | `#1c75bd` | `#90caf9` |
| `--bg-card` | `bgCard` | `#ffffff` | `#23272a` |

---

### Placeholder Screens Created (for navigation completeness)

10 placeholder screens created so the navigation tree compiles and routes are testable:
- `HomeScreen.tsx`, `InsightsScreen.tsx`, `BudgetScreen.tsx`, `SettingsScreen.tsx`
- `ManageTagsScreen.tsx`, `ManageVendorTagsScreen.tsx`, `ReloadDataScreen.tsx`
- `AutoTagExpensesScreen.tsx`, `ManageBanksScreen.tsx`, `ConfigurationScreen.tsx`

Each uses `useAppTheme()` for theme-aware styling. Implementation filled in during Epics 4-7.

---

### Updated Root App Component

**File Updated**: `mobile/App.tsx`

**Wiring**:
```
GestureHandlerRootView (required by react-native-gesture-handler)
└── SafeAreaProvider (safe area insets for notch/status bar)
    └── Redux Provider (store)
        └── AppInitializer (LocalDB.initDB on mount)
            └── AppNavigator (ThemeContext + AuthProvider + NavigationContainer)
```

**Key Design**: `LocalDB.initDB()` called once on app mount via `useEffect` in `AppInitializer` — mirrors web's `FinanceIndexDB.initDB()` call in `App.tsx`.

---

## Summary: What's Built So Far

| Epic | Stories | Status | Files | Lines |
|---|---|---|---|---|
| 1. Foundation | PW-001 through PW-008 | COMPLETE | 21 | ~2,000 |
| 2. Authentication | PW-009, PW-010 | COMPLETE | 3 | ~170 |
| 3. Navigation & Shell | PW-011, PW-012, PW-013 | COMPLETE | 16 | ~450 |
| **Total** | **13 stories** | **COMPLETE** | **40 files** | **~2,620** |

## What's Next

**Epic 4: Core Screens — Home & Expense Management** (PW-014 through PW-022)
- LoginScreen already implemented (PW-014 done as part of navigation setup)
- Home screen with grouped SectionList, search, filtering
- Add/Tag/Merge/Delete expense dialogs
- Long-press selection mode
- Pull-to-refresh

**Epic 5: Insights & Charts** (PW-023 through PW-027)

**Epic 6: Budget Management** (PW-028, PW-029)

**Epic 7: Settings & Profile** (PW-030 through PW-036)
