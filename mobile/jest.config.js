module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-firebase|@react-native-google-signin|@react-native-clipboard|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|@react-navigation|react-native-sqlite-storage|uuid)/)',
  ],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
