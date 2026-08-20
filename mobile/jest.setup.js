jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    executeSql: jest.fn(() => Promise.resolve([{rows: {length: 0, item: jest.fn()}}])),
    transaction: jest.fn(cb => cb({executeSql: jest.fn()})),
  })),
}));

jest.mock('@react-native-firebase/app', () => ({}));

jest.mock('@react-native-firebase/auth', () => () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => Promise.resolve({exists: false, data: () => null})),
      delete: jest.fn(() => Promise.resolve()),
    })),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({empty: true, docs: []})),
    })),
  })),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({data: {idToken: 'mock-token'}})),
    revokeAccess: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));
