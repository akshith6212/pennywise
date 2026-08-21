import React, {createContext, useContext} from 'react';

export interface AppTheme {
  dark: boolean;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  textWhite: string;

  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  bgCardHeader: string;

  // Border colors
  borderColor: string;
  borderColorDark: string;

  // Accent colors
  accentRed: string;
  accentBlue: string;
  accentPurple: string;
  accentGreen: string;
  accentYellow: string;

  // Subtle accent backgrounds
  accentRedSubtle: string;
  accentBlueSubtle: string;
  accentPurpleSubtle: string;
  accentGreenSubtle: string;
  accentYellowSubtle: string;

  // Component-specific
  searchBg: string;
  searchText: string;
  searchPlaceholder: string;
  searchBorder: string;

  // Group box
  groupBg: string;
  groupHeaderBg: string;
  groupHeaderHover: string;
  groupLabel: string;
  groupCount: string;

  // Overlay
  overlayBg: string;

  // Shadows
  boxShadow: string;

  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
}

export const lightTheme: AppTheme = {
  dark: false,

  textPrimary: '#212529',
  textSecondary: '#495057',
  textMuted: '#6c757d',
  textLight: '#adb5bd',
  textWhite: '#ffffff',

  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fa',
  bgTertiary: '#e9ecef',
  bgCard: '#ffffff',
  bgCardHeader: '#f1f3f5',

  borderColor: '#dee2e6',
  borderColorDark: '#ced4da',

  accentRed: '#ca1919',
  accentBlue: '#1c75bd',
  accentPurple: '#3049d6',
  accentGreen: '#23ad29',
  accentYellow: '#ffca28',

  accentRedSubtle: 'rgba(233, 120, 120, 0.1)',
  accentBlueSubtle: 'rgba(144, 202, 249, 0.1)',
  accentPurpleSubtle: 'rgba(103, 125, 247, 0.1)',
  accentGreenSubtle: 'rgba(102, 187, 106, 0.1)',
  accentYellowSubtle: 'rgba(255, 202, 40, 0.1)',

  searchBg: '#f8f9fa',
  searchText: '#212529',
  searchPlaceholder: '#6c757d',
  searchBorder: '#ced4da',

  groupBg: '#ffffff',
  groupHeaderBg: '#e7e9ec',
  groupHeaderHover: '#e9ecef',
  groupLabel: '#212529',
  groupCount: '#6c757d',

  overlayBg: 'rgba(0, 0, 0, 0.5)',
  boxShadow: 'rgba(0, 0, 0, 0.3)',

  statusBarStyle: 'dark-content',
};

export const darkTheme: AppTheme = {
  dark: true,

  textPrimary: '#e0e0e0',
  textSecondary: '#b0bec5',
  textMuted: '#9e9e9e',
  textLight: '#78909c',
  textWhite: '#ffffff',

  bgPrimary: '#181a1b',
  bgSecondary: '#23272a',
  bgTertiary: '#2a3035',
  bgCard: '#23272a',
  bgCardHeader: '#2a3035',

  borderColor: '#3a4045',
  borderColorDark: '#4e5358',

  accentRed: '#e97878',
  accentBlue: '#90caf9',
  accentPurple: '#677df7',
  accentGreen: '#66bb6a',
  accentYellow: '#ffca28',

  accentRedSubtle: 'rgba(233, 120, 120, 0.15)',
  accentBlueSubtle: 'rgba(144, 202, 249, 0.15)',
  accentPurpleSubtle: 'rgba(103, 125, 247, 0.15)',
  accentGreenSubtle: 'rgba(102, 187, 106, 0.15)',
  accentYellowSubtle: 'rgba(255, 202, 40, 0.15)',

  searchBg: '#23272a',
  searchText: '#e0e0e0',
  searchPlaceholder: '#9e9e9e',
  searchBorder: '#3a4045',

  groupBg: '#23272a',
  groupHeaderBg: '#2a3035',
  groupHeaderHover: '#323a42',
  groupLabel: '#e0e0e0',
  groupCount: '#b0bec5',

  overlayBg: 'rgba(0, 0, 0, 0.7)',
  boxShadow: 'rgba(0, 0, 0, 0.2)',

  statusBarStyle: 'light-content',
};

export const ThemeContext = createContext<AppTheme>(lightTheme);

export const useAppTheme = (): AppTheme => {
  return useContext(ThemeContext);
};

export const getNavigationTheme = (theme: AppTheme) => ({
  dark: theme.dark,
  colors: {
    primary: theme.accentBlue,
    background: theme.bgPrimary,
    card: theme.bgCard,
    text: theme.textPrimary,
    border: theme.borderColor,
    notification: theme.accentRed,
  },
  fonts: {
    regular: {fontFamily: 'System', fontWeight: '400' as const},
    medium: {fontFamily: 'System', fontWeight: '500' as const},
    bold: {fontFamily: 'System', fontWeight: '700' as const},
    heavy: {fontFamily: 'System', fontWeight: '900' as const},
  },
});
