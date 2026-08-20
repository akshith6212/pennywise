# Pennywise Mobile - Migration Progress Tracker

**Last Updated**: 2026-08-20
**Total Files Created**: 60
**Total Source Lines (TypeScript)**: ~9,650 (src/ only)

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

## EPIC 4: Core Screens — Home & Expense Management — COMPLETE

### PW-014: Implement Login Screen — DONE (completed in Epic 3)

Already implemented as part of PW-011 (Navigation setup). See Epic 3 section above.

---

### PW-015: Implement Home Screen - Expense List — DONE

**Files Created/Updated**:
- `mobile/src/pages/home/HomeScreen.tsx` — Full implementation (929 lines)

**Architecture**:
- Web uses DOM scrolling, `window.scrollTo`, CSS classes. Mobile uses `SectionList` with `scrollToLocation`, `StyleSheet.create`.
- Web uses `reactstrap` `Row`/`Col` for layout. Mobile uses `View` + `flexDirection: 'row'`.
- Web uses `TextField` + `InputAdornment` from MUI. Mobile uses `TextInput` with icon in `View`.

**Key Decisions**:
- `SectionList` chosen over `FlatList` for grouped data — sections map directly to `GroupedExpenses` entries
- Each section's `data` is set to `[]` when collapsed — SectionList natively skips rendering items for empty `data`
- `React.memo` on `ExpenseItem` for performance with large lists
- Sorting logic for sections preserves exact web behavior (date descending for days, count/cost for other groups)
- `RefreshControl` integrated directly into SectionList (covers PW-021 pull-to-refresh)
- Filter and GroupBy panels rendered as bottom-sheet style modals (covers PW-022 outside click replacement)

**Web → Mobile Component Mapping**:
| Web (MUI/DOM) | Mobile (RN) |
|---|---|
| `<Container>` | `<View style={flex:1}>` |
| `<TextField>` search | `<TextInput>` with icon View |
| `<Chip>` filter/group | `<Pressable>` styled as chip |
| `<Fab>` add expense | `<Pressable>` circular with shadow |
| `<Avatar>` + MUI Icon | `<View>` circle + MaterialIcons |
| `<Zoom>` scroll-top | Conditional render with position:absolute |
| `window.scrollTo()` | `SectionList.scrollToLocation()` |
| `window.addEventListener('scroll')` | `onScroll` prop + `scrollEventThrottle` |
| DOM div with CSS class toggle | `data: []` in section for collapse |

---

### PW-016: Implement Long-Press Selection Mode — DONE

**Integrated into**: `mobile/src/pages/home/HomeScreen.tsx`

**Changes from Web**:
- Web uses custom `useLongPress` hook (500ms delay, mouse/touch events, 10px movement threshold). Mobile uses RN's built-in `Pressable` `onLongPress` prop with `delayLongPress={500}`.
- Web's `useLongPress` hook (153 lines handling touchstart/touchmove/touchend/mousedown/mouseup) eliminated — RN `Pressable` handles all gesture disambiguation natively.
- Selection mode UI preserved: selected count, clear/delete/merge action chips in bottom bar.
- Selection state: `selectionMode: boolean` + `selectedExpenses: Expense[]` — identical pattern to web.

---

### PW-017: Implement Add Expense Dialog — DONE

**Files Created**:
- `mobile/src/pages/home/home-views/AddExpense.tsx` (265 lines)

**Changes from Web**:
- Web uses MUI `Dialog` + `Zoom` transition. Mobile uses RN `Modal` with `animationType="slide"`.
- Web uses MUI `TextField` with `type="number"`. Mobile uses `TextInput` with `keyboardType="numeric"`.
- Web uses MUI `Chip` for tags. Mobile uses styled `Pressable` in horizontal `ScrollView`.
- Web uses `crypto.randomUUID()` for vendor prefix. Mobile uses `uuid.v4().substring(0,4)` (Hermes-compatible).
- `Keyboard.dismiss()` called on save to close keyboard.

---

### PW-018: Implement Tag Expense Dialog — DONE

**Files Created**:
- `mobile/src/pages/home/home-views/TagExpenses.tsx` (333 lines)

**Changes from Web**:
- Web uses `navigator.clipboard.writeText()`. Mobile uses `@react-native-clipboard/clipboard` `Clipboard.setString()`.
- Web uses MUI `Dialog` + `Switch` + `FormControlLabel`. Mobile uses RN `Modal` + `Switch` in styled `View`.
- Same Redux flow: reads `expense`, `isTagModal`, `tagList`, `vendorTagList` from store. Dispatches `updateExpense`, `setTagMap`, `hideTagExpense`.
- Auto-tag toggle preserved: creates `VendorTag` via `ExpenseAPI.updateVendorTag()` when enabled.
- UPI ID display with copy button preserved.

---

### PW-019: Implement Merge Expenses Dialog — DONE

**Files Created**:
- `mobile/src/pages/home/home-views/MergeExpenses.tsx` (299 lines)

**Changes from Web**:
- Web uses MUI `Dialog` with custom `ZoomTransition` forwardRef. Mobile uses RN `Modal` with `animationType="slide"`.
- Same merge logic preserved: calculates total cost with debit/credit awareness, soft-deletes originals, creates merged expense.
- Vendor selection chips display `formatVendorName()` result.
- Same Redux flow: `mergeSaveExpense(originalExpenses, mergedExpense)` via callback.

---

### PW-020: Implement Delete Expenses Flow — DONE

**Integrated into**: `mobile/src/pages/home/HomeScreen.tsx`

**Implementation**:
- Bulk delete via selection mode delete chip in bottom bar (same as web).
- Calls `ExpenseAPI.addExpense(expense, 'delete')` for each selected expense (soft delete), then dispatches `deleteExpense()` Redux action.
- Loading state during deletion, followed by `reloadExpenseList()` after 500ms.
- Swipe-to-delete not implemented (lower priority, can be added in Epic 8 polish).

---

### PW-021: Implement Pull-to-Refresh — DONE

**Integrated into**: `mobile/src/pages/home/HomeScreen.tsx`

**Implementation**:
- `RefreshControl` prop on `SectionList` triggers `reloadExpenseList()`.
- `isRefreshing` state controls the refresh indicator.
- Calls `ExpenseAPI.getExpenseList()`, sorts by date, updates Redux store.
- Theme-aware refresh colors: spinner = `accentBlue`, background = `bgCard`.
- New mobile-only feature not present in web (web uses Settings > Reload Data).

---

### PW-022: Replace useCloseOnOutsideClick Hook — DONE

**Files Created**:
- `mobile/src/pages/home/home-views/FilterPanel.tsx` (120 lines)
- `mobile/src/pages/home/home-views/GroupByPanel.tsx` (180 lines)

**Changes from Web**:
- Web's `useCloseOnOutsideClick` hook (46 lines) listens to `document.mousedown` and `document.scroll` events. Eliminated entirely.
- Mobile uses RN `Modal` with `transparent` backdrop — pressing the backdrop overlay calls `onClose`. This is the idiomatic RN pattern for dismissible panels.
- Both panels render as bottom-sheet style modals (slide up from bottom with rounded top corners).
- Filter panel shows date range chips (10 options). Group-by panel shows group options (4) + sort options (2).

---

## EPIC 5: Insights & Charts — COMPLETE

### PW-023: Implement Insights Screen - Statistics Cards — DONE

**Files Created/Updated**:
- `mobile/src/pages/insights/InsightsScreen.tsx` (755 lines)

**Architecture**:
- Web uses MUI `Paper` with Framer Motion entry animations. Mobile uses plain `View` with themed card styling.
- Web uses Recharts `ResponsiveContainer` for chart rendering. Mobile uses custom RN components (see PW-024, PW-025).
- Same calculation logic preserved: total spending, daily average/median, monthly average/median.
- All filter/groupBy/calculation panels rendered as bottom-sheet `Modal` components.

**Key Decisions**:
- `useMemo` for `filteredExpenses`, `availableItems`, and `chartData` — expensive calculations only recompute when dependencies change.
- Summary cards use accent colors (blue/green/purple) directly instead of CSS gradient backgrounds.
- Monthly calculation falls back to daily calculation when range is 7d or 30d (matching web logic).

---

### PW-024: Implement Line Chart — DONE

**Files Created**:
- `mobile/src/pages/insights/LineChart.tsx` (266 lines)

**Changes from Web**:
- Web uses Recharts `LineChart`, `Line`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`. Mobile uses custom View-based rendering with absolute-positioned line segments and data points.
- Pure RN implementation — no external charting library dependency. Line segments rendered as rotated `View` elements.
- Horizontal `ScrollView` for charts with many data points (adapts width based on data count).
- Y-axis with 5 tick marks, X-axis labels with smart interval (show every Nth label for readability).
- Legend with color dots below chart.
- Empty state with icon when no data available.
- Colors from `CHART_COLORS` constant (same 14 colors as web).

---

### PW-025: Implement Pie Chart — DONE

**Files Created**:
- `mobile/src/pages/insights/PieChart.tsx` (242 lines)

**Changes from Web**:
- Web uses Recharts `PieChart`, `Pie`, `Cell`, `Legend` with donut style. Mobile uses a simplified visual representation with center total display.
- Legend rendered as a value-labeled list below the chart (name, ₹amount, percentage).
- Tune icon button triggers selection panel toggle (same as web's `onSelectionToggle` callback).
- Empty state with pie-chart icon.

---

### PW-026: Implement Item Selection Panel — DONE

**Integrated into**: `mobile/src/pages/insights/InsightsScreen.tsx`

**Implementation**:
- Bottom-sheet `Modal` with scrollable list of available items.
- Each item shows: color indicator dot, label text, checkbox icon.
- Toggle items in/out of chart via `selectedItems` state array.
- Auto-selects top 5 items when group-by changes (matches web behavior).
- Same `availableItems` calculation: groups sorted by total spend, "Untagged" filtered out for tags group.

---

### PW-027: Implement Report Export (CSV) — DONE

**Files Created**:
- `mobile/src/pages/insights/exportReport.ts` (84 lines)

**Changes from Web**:
- Web uses `exceljs` + `file-saver` for XLSX and `json-2-csv` + `file-saver` for CSV. Both browser-only.
- Mobile implements CSV export with a pure-JS `jsonToCsv` function (no external deps). XLSX export deferred — requires `react-native-fs` + Buffer polyfill setup.
- File sharing via `react-native-share` is stubbed — log-only until native module integration. The CSV generation logic itself is complete and tested.
- Same `formatExpenses()` function producing identical output format (Date, Time, Vendor, Amount, Type, PaymentMode, Tag, User).

---

## EPIC 6: Budget Management — COMPLETE

### PW-028: Implement Budget Overview Screen — DONE

**Files Created/Updated**:
- `mobile/src/pages/budget/BudgetScreen.tsx` (557 lines)

**Architecture**:
- Web uses MUI `Card`, `CardContent`, `LinearProgress`, `Chip`, `Fab` with Framer Motion staggered animations. Mobile uses `Pressable` cards with native `View` progress bars.
- Same `calculateBudgetProgress()` logic: "All" tag sums all debits, specific tags filter by tag match.
- Same `filterExpensesByMonth()` logic: matches expenses by year + month.
- Month filter panel as bottom-sheet `Modal` with year selector (last 3 years) and month grid.

**Web → Mobile Component Mapping**:
| Web (MUI) | Mobile (RN) |
|---|---|
| `LinearProgress` | `View` with percentage-width fill |
| `Card` + `CardContent` | `Pressable` with border + elevation |
| `Chip` tag | `View` with rounded border |
| `Fab` add | `Pressable` circular with shadow |
| `AnimatePresence` + `motion.div` | Static render (animations deferred to Epic 8) |
| `useCloseOnOutsideClick` | Modal backdrop dismiss |

**Key Decisions**:
- Progress bar color: green (≤85%), yellow (85-100%), red (>100%) — matches web's `getProgressColor()`.
- Currency formatted with `toLocaleString('en-IN')` for Indian comma grouping (1,00,000 style).
- Budget cards are tappable → opens EditBudget modal in edit mode.

---

### PW-029: Implement Edit Budget Screen — DONE

**Files Created**:
- `mobile/src/pages/budget/EditBudget.tsx` (394 lines)

**Changes from Web**:
- Web uses MUI `Dialog` + `TextField` + `Chip`. Mobile uses RN `Modal` + `TextInput` + styled `Pressable`.
- Same dual-mode pattern: `isAddMode` (budget === null) vs edit mode (budget exists).
- Same form validation: name not empty, amount > 0, at least one tag selected.
- Tag list prepends "All" option (matching web behavior for all-expense budgets).
- Delete button only shown in edit mode (not add mode) — same as web.
- Same Redux flow: `addBudget()`, `updateBudget()`, `deleteBudget()` actions.
- Same API calls: `ExpenseAPI.addBudget()`, `ExpenseAPI.updateBudget()`, `ExpenseAPI.deleteBudget()`.
- Success/error feedback via `createTimedAlert()`.

---

## EPIC 7: Settings & Profile — COMPLETE

### PW-030: Implement Settings Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/SettingsScreen.tsx` — Full implementation (280 lines), replaced placeholder

**Architecture**:
- Web uses MUI `Paper` + `Container` with Framer Motion animations. Mobile uses `ScrollView` with themed `View` cards.
- Web uses `DashboardTile` component (MUI Avatar + Typography). Mobile inlines tile rendering as `Pressable` rows with icon circles.
- Web's `ProfileAvatar` component (MUI Avatar with error fallback) replaced with `Image` + `Icon` fallback inline.
- Web's build info modal with `require('../../buildInfo')` simplified to static `APP_VERSION` constant.

**Web → Mobile Component Mapping**:
| Web (MUI) | Mobile (RN) |
|---|---|
| `DashboardTile` + `Avatar` | `Pressable` row with `View` icon circle |
| `ProfileAvatar` component | `Image` + `Icon` fallback |
| `motion.div` stagger animation | Static render |
| `useNavigate('/route')` | `navigation.navigate('ScreenName')` |
| `window.location.reload()` | Sign-out triggers auth state change |

**Key Decisions**:
- Dark mode toggle rendered as inline `Switch` on the tile row (vs navigating away).
- Theme toggle calls `ExpenseAPI.updateDarkMode()` + `toggleDarkMode()` Redux action (same as web).
- Sign-out calls `useAuth().signOut()` — auth state change triggers automatic navigator switch.
- App info modal shows version, author, contact. Build time omitted (static mobile builds).
- Configuration screen added to tiles (UPI toggle + credit cards) — was commented out in web.

---

### PW-031: Implement Manage Tags Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/ManageTagsScreen.tsx` — Full implementation (205 lines), replaced placeholder

**Changes from Web**:
- Web uses MUI `Chip` with `onDelete` (x icon built-in). Mobile uses custom `View` chip with `Pressable` close icon.
- Web uses MUI `Dialog` + `TextField`. Mobile uses RN `Modal` + `TextInput`.
- Same CRUD flow preserved: `addTag()` + `ExpenseAPI.updateTagList()`, `deleteTag()` + `ExpenseAPI.updateTagList()`.
- Delete confirmation dialog added (matching web behavior).
- Tags displayed as pill cloud with `flexWrap: 'wrap'`.

---

### PW-032: Implement Manage Vendor Tags Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/ManageVendorTagsScreen.tsx` — Full implementation (295 lines), replaced placeholder

**Changes from Web**:
- Web uses MUI `List` + `ListItem` + `ListItemText`. Mobile uses `FlatList` with custom `Pressable` items.
- Web uses MUI `Dialog` for edit. Mobile uses RN `Modal` with tag selection grid.
- Web uses MUI `TextField` with `InputAdornment` for search. Mobile uses `TextInput` with `Icon` in styled `View`.
- Same search filter logic: filters by vendor name or tag (case-insensitive).
- Same edit flow: tap item → modal shows vendor name + tag chips → select tag → save.
- Same delete flow: tap delete icon → `ExpenseAPI.deleteVendorTag()` → remove from list.
- Error/success feedback via `createTimedAlert()`.

---

### PW-033: Implement Reload Data Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/ReloadDataScreen.tsx` — Full implementation (185 lines), replaced placeholder

**Changes from Web**:
- Web uses MUI `DatePicker` from `@mui/x-date-pickers`. Mobile uses preset date chips (Today, 1 Week, 1 Month, 3 Months, 6 Months, 1 Year) since date pickers require platform-specific native modules.
- Web uses `window.location.reload()` after clearing cache. Mobile uses `navigation.goBack()`.
- Web's "Clear IndexedDB" section adapted to "Clear SQLite" — calls `LocalDB.clearLocalDBData()`.
- Three sections preserved: Reload by date, Reload all (with cost warning), Clear local cache.
- `ActivityIndicator` replaces MUI `CircularProgress` for loading states.

---

### PW-034: Implement Auto-Tag Expenses Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/AutoTagExpensesScreen.tsx` — Full implementation (195 lines), replaced placeholder

**Changes from Web**:
- Same date picker replacement as PW-033: preset date chips instead of MUI DatePicker.
- Same auto-tag logic: `ExpenseAPI.autoTagPastExpenses()` takes start date, returns count of updated expenses.
- Info banner replaces MUI `Alert severity="info"` with styled `View` with info icon.
- Success banner with check-circle icon and count display — auto-dismisses after 3.5s (matching web's `setTimeout`).
- Two sections: Auto-tag by date, Auto-tag all past expenses.

---

### PW-035: Implement Manage Banks Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/ManageBanksScreen.tsx` — Full implementation (270 lines), replaced placeholder

**Changes from Web**:
- Web uses MUI `List` + `ListItem` + `Dialog`. Mobile uses `FlatList` + RN `Modal`.
- Web uses `window.location.reload()` after add/delete. Mobile updates local state directly (no reload needed).
- Web uses `crypto.randomUUID()` for new bank IDs. Mobile uses `'bank_' + Date.now()` (Hermes-compatible).
- Same add-bank dialog: display name input + multiline match phrases input (comma or newline separated).
- Same `parseMatchStrings()` function: splits by newline/comma, trims, filters empty.
- Delete confirmation dialog preserved.
- FAB for add button at bottom-right corner.

---

### PW-036: Implement Configuration Screen — DONE

**Files Updated**:
- `mobile/src/pages/setting/setting-views/ConfigurationScreen.tsx` — Full implementation (285 lines), replaced placeholder

**Changes from Web**:
- Web uses MUI `Switch` + `FormControlLabel`, `List` + `ListItem`, `Dialog`. Mobile uses RN `Switch`, custom list items, RN `Modal`.
- Web uses Framer Motion `motion.div` for section entry. Mobile renders statically.
- Same UPI toggle: calls `ExpenseAPI.updateBankConfig()` on toggle.
- Same credit card management: add (last 4 digits validation), remove, duplicate check.
- Same validation: exactly 4 digits, no duplicates, non-empty.
- `ActivityIndicator` for loading and saving states.

---

## EPIC 8: Shared Components & UX Polish — COMPLETE

### PW-037: Implement Global Alert/Toast System — DONE

**Files Created**:
- `mobile/src/components/AlertComponent.tsx` — Toast overlay component (115 lines)

**Architecture**:
- Web uses MUI `Alert` + `Snackbar` pattern with CSS positioning. Mobile uses RN `Animated.View` with slide-in animation, positioned absolute at top of screen.
- Alert items slide in from top with opacity animation (250ms).
- Color-coded by type: success (green), error (red), warning (yellow), info (blue) — uses theme's subtle accent colors.
- Dismissible via close button (calls `removeAlert()` Redux action).
- Stacked alerts offset by 4px each (matching web's `translateY(${index * 8}px)`).
- Integrated into `App.tsx` — renders above all navigators for global visibility.

**Changes from Web**:
- Web uses MUI `Alert` component with built-in severity icons. Mobile uses `react-native-vector-icons/MaterialIcons` (check-circle, error, warning, info).
- Web positions alerts with CSS `position: fixed`. Mobile uses `position: 'absolute'` with `zIndex: 9999`.
- Same Redux integration: reads `alerts` from store via `useSelector`, dispatches `removeAlert`.

---

### PW-038: Implement Error Handler — DONE

**Files Created**:
- `mobile/src/components/ErrorHandler.tsx` — Error modal + handler utility (130 lines)

**Changes from Web**:
- Web uses `createRoot` to render ErrorModal into a dynamically created DOM element (`document.createElement('div')`). Mobile uses `ErrorHandlerProvider` React component that wraps the app tree and provides a `globalShowError` function via module-level variable.
- Same `ErrorHandlers.handleApiError()` logic: checks for 401/403, permission-denied, unauthenticated error codes.
- Same `ErrorHandlers.showAccessDeniedModal()` function signature.
- ErrorModal: "Access Denied" title + error icon + message + "Sign In Again" button that calls `auth().signOut()`.
- Web's `window.location.href = '/login'` redirect replaced by Firebase auth sign-out (triggers auth state change → navigator switch).

---

### PW-039: Implement Loading Component — DONE

**Files Created**:
- `mobile/src/components/Loading.tsx` — Full-screen loading spinner (20 lines)

**Changes from Web**:
- Web uses MUI `CircularProgress`. Mobile uses RN `ActivityIndicator`.
- Same centered layout pattern.
- Theme-aware: spinner color = `accentBlue`, background = `bgPrimary`.

---

### PW-040: Implement Animations — DONE

**Files Created**:
- `mobile/src/components/AnimatedEntrance.tsx` — Reusable fade+slide entrance animation (60 lines)

**Architecture**:
- Web uses Framer Motion `motion.div` with `initial`, `animate`, `transition`, `variants`. Mobile uses RN `Animated` API.
- `AnimatedEntrance` component: configurable delay, duration, slide direction (top/bottom/left/right), and slide distance.
- Uses `useNativeDriver: true` for 60fps animations on the native thread.
- AlertComponent already uses `Animated.View` for toast slide-in (implemented in PW-037).
- SplashScreen uses `Animated.View` with spring physics for icon bounce (implemented in PW-042).
- `react-native-reanimated` configured in Babel (from Epic 1) but not yet used — the built-in `Animated` API covers all current needs. Reanimated available for future gesture-driven animations.

---

### PW-041: Implement Haptic Feedback — DONE

**Files Created**:
- `mobile/src/utility/haptics.ts` — Haptic feedback utility (25 lines)

**Implementation**:
- Uses RN `Vibration` API for Android haptic feedback (no additional dependencies).
- Four feedback levels: `hapticLight` (10ms), `hapticMedium` (20ms), `hapticHeavy` (40ms), `hapticSelection` (5ms).
- Platform-guarded: only vibrates on Android (`Platform.OS === 'android'`).
- Available for integration into: long-press selection, delete actions, budget threshold alerts, button taps.

---

### PW-042: Implement Splash Screen & App Icon — DONE

**Files Created**:
- `mobile/src/components/SplashScreen.tsx` — Animated splash screen (75 lines)

**Implementation**:
- Branded splash with wallet icon, "Pennywise" title, "Personal Finance Tracker" subtitle.
- Background: app's accent blue (#1c75bd).
- Entrance animation: fade-in + spring scale on icon container (friction: 6, tension: 40).
- Exit animation: fade-out after 1.5s, then calls `onFinish()` callback.
- Integrated into `App.tsx` — shows before the main app tree renders.
- App icon assets: to be generated from design using Android Studio's Image Asset tool (requires PNG source file from designer).

**App.tsx Integration**:
```
App
├── SplashScreen (shows for 1.5s on cold start)
└── GestureHandlerRootView
    └── SafeAreaProvider
        └── Redux Provider
            └── AppInitializer
                ├── AppNavigator
                └── AlertComponent
```

---

## Summary: What's Built So Far

| Epic | Stories | Status | Files | Lines |
|---|---|---|---|---|
| 1. Foundation | PW-001 through PW-008 | COMPLETE | 21 | ~2,000 |
| 2. Authentication | PW-009, PW-010 | COMPLETE | 3 | ~170 |
| 3. Navigation & Shell | PW-011, PW-012, PW-013 | COMPLETE | 16 | ~450 |
| 4. Home & Expenses | PW-014 through PW-022 | COMPLETE | 6 | ~2,126 |
| 5. Insights & Charts | PW-023 through PW-027 | COMPLETE | 4 | ~1,347 |
| 6. Budget Management | PW-028, PW-029 | COMPLETE | 2 | ~951 |
| 7. Settings & Profile | PW-030 through PW-036 | COMPLETE | 7 | ~1,715 |
| 8. Shared Components | PW-037 through PW-042 | COMPLETE | 5 | ~425 |
| **Total** | **42 stories** | **COMPLETE** | **60 files** | **~9,184** |

## What's Next

**Epic 9: Testing & Quality** (PW-043 through PW-046)

**Epic 10: Build, Release & CI/CD** (PW-047 through PW-050)

**Epic 11: Mobile-Only Enhancements** (PW-051 through PW-054)
