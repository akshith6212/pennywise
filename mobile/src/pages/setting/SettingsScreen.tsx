import React, {useState} from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../login/AuthContext';
import {selectExpense, toggleDarkMode} from '../../store/expenseActions';
import {createTimedAlert} from '../../store/alertActions';
import {ExpenseAPI} from '../../api/ExpenseAPI';
import {useAppTheme} from '../../styles/theme';
import {ProfileStackParamList} from '../../navigation/types';

type NavProp = NativeStackNavigationProp<ProfileStackParamList, 'SettingsMain'>;

interface TileConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route?: keyof ProfileStackParamList;
  action?: string;
}

const APP_VERSION = '1.0.0';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const theme = useAppTheme();
  const {appConfig} = useSelector(selectExpense);
  const {userProfile, signOut, isLoading} = useAuth();
  const [appInfoVisible, setAppInfoVisible] = useState(false);

  const toggleTheme = async () => {
    try {
      const success = await ExpenseAPI.updateDarkMode(!appConfig.darkMode);
      if (success) {
        toggleDarkMode();
      }
    } catch (error) {
      console.error('Error updating dark mode:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (!result.success && result.error) {
        createTimedAlert({type: 'error', message: result.error});
      }
    } catch (error) {
      createTimedAlert({
        type: 'error',
        message: 'Failed to sign out. Please try again.',
      });
      console.error('Error signing out:', error);
    }
  };

  const tiles: TileConfig[] = [
    {
      id: 'tags',
      title: 'Tags',
      subtitle: 'Manage your expense tags',
      icon: 'local-offer',
      color: '#ce93d8',
      route: 'ManageTags',
    },
    {
      id: 'theme',
      title: `${appConfig.darkMode ? 'Light' : 'Dark'} Theme`,
      subtitle: `Switch to ${appConfig.darkMode ? 'light' : 'dark'} mode`,
      icon: 'brightness-4',
      color: '#9c27b0',
      action: 'toggle-theme',
    },
    {
      id: 'reload',
      title: 'Reload Data',
      subtitle: 'Reload your expense, local cache data',
      icon: 'refresh',
      color: '#ffa726',
      route: 'ReloadData',
    },
    {
      id: 'manage-tag-maps',
      title: 'Manage Vendor Tags',
      subtitle: 'Configure your vendor tag mappings',
      icon: 'map',
      color: '#64b5f6',
      route: 'ManageVendorTags',
    },
    {
      id: 'auto-tag',
      title: 'Auto-tag Expenses',
      subtitle: 'Automatically tag past expenses',
      icon: 'auto-awesome',
      color: '#4db6ac',
      route: 'AutoTagExpenses',
    },
    {
      id: 'banks',
      title: 'Banks',
      subtitle: 'Email parsing: display name & match phrases',
      icon: 'account-balance',
      color: '#26a69a',
      route: 'ManageBanks',
    },
    {
      id: 'config',
      title: 'Configuration',
      subtitle: 'UPI toggle, credit cards',
      icon: 'settings',
      color: '#78909c',
      route: 'Configuration',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Budget alert preferences',
      icon: 'notifications',
      color: '#42a5f5',
      route: 'NotificationSettings',
    },
    {
      id: 'biometric',
      title: 'App Lock',
      subtitle: 'Fingerprint or face unlock',
      icon: 'fingerprint',
      color: '#ef5350',
      route: 'BiometricSettings',
    },
    {
      id: 'reminder',
      title: 'Daily Reminder',
      subtitle: 'Nudge to log expenses',
      icon: 'alarm',
      color: '#ab47bc',
      route: 'ReminderSettings',
    },
    {
      id: 'sign-out',
      title: 'Sign Out',
      subtitle: 'Log out of your account',
      icon: 'logout',
      color: '#f44336',
      action: 'sign-out',
    },
  ];

  const handleTilePress = (tile: TileConfig) => {
    if (tile.action === 'toggle-theme') {
      void toggleTheme();
      return;
    }
    if (tile.action === 'sign-out') {
      void handleSignOut();
      return;
    }
    if (tile.route) {
      navigation.navigate(tile.route);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <View style={styles.profileRow}>
            {userProfile.photoUrl ? (
              <Image
                source={{uri: userProfile.photoUrl}}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[styles.avatar, {backgroundColor: theme.accentBlue}]}>
                <Icon name="account-circle" size={36} color={theme.textWhite} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, {color: theme.textPrimary}]}>
                {userProfile.name}
              </Text>
              <Text style={[styles.profileEmail, {color: theme.textMuted}]}>
                {userProfile.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Dashboard Tiles */}
        <View style={styles.tilesContainer}>
          {tiles.map((tile, index) => (
            <React.Fragment key={tile.id}>
              <Pressable
                onPress={() => handleTilePress(tile)}
                style={({pressed}) => [
                  styles.tileRow,
                  pressed && {opacity: 0.7},
                ]}>
                <View
                  style={[styles.tileIcon, {backgroundColor: tile.color + '20'}]}>
                  <Icon name={tile.icon} size={22} color={tile.color} />
                </View>
                <View style={styles.tileText}>
                  <Text style={[styles.tileTitle, {color: theme.textPrimary}]}>
                    {tile.title}
                  </Text>
                  <Text
                    style={[styles.tileSubtitle, {color: theme.textMuted}]}>
                    {tile.subtitle}
                  </Text>
                </View>
                {tile.id === 'theme' ? (
                  <Switch
                    value={appConfig.darkMode}
                    onValueChange={() => void toggleTheme()}
                    trackColor={{false: '#ccc', true: theme.accentPurple}}
                    thumbColor={theme.textWhite}
                  />
                ) : (
                  <Icon
                    name="chevron-right"
                    size={22}
                    color={theme.textLight}
                  />
                )}
              </Pressable>
              {index < tiles.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    {backgroundColor: theme.borderColor},
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Version */}
        <Pressable onPress={() => setAppInfoVisible(true)}>
          <Text style={[styles.versionText, {color: theme.textLight}]}>
            Pennywise v{APP_VERSION}
          </Text>
        </Pressable>
      </ScrollView>

      {/* App Info Modal */}
      <Modal
        visible={appInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppInfoVisible(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setAppInfoVisible(false)}>
          <Pressable
            style={[styles.infoDialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.infoTitle, {color: theme.textPrimary}]}>
              Pennywise App
            </Text>
            <Text style={[styles.infoRow, {color: theme.textSecondary}]}>
              Version: v{APP_VERSION}
            </Text>
            <Text style={[styles.infoRow, {color: theme.textSecondary}]}>
              Author: rushikc
            </Text>
            <Text style={[styles.infoRow, {color: theme.textSecondary}]}>
              Contact: rushikc.dev@gmail.com
            </Text>
            <Pressable
              onPress={() => setAppInfoVisible(false)}
              style={[styles.closeButton, {backgroundColor: theme.accentBlue}]}>
              <Text style={[styles.closeButtonText, {color: theme.textWhite}]}>
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 32},
  profileCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileInfo: {flex: 1},
  profileName: {fontSize: 18, fontWeight: '700'},
  profileEmail: {fontSize: 13, marginTop: 2},
  tilesContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileText: {flex: 1},
  tileTitle: {fontSize: 15, fontWeight: '600'},
  tileSubtitle: {fontSize: 12, marginTop: 2},
  divider: {height: StyleSheet.hairlineWidth, marginLeft: 58},
  versionText: {textAlign: 'center', fontSize: 12, paddingVertical: 12},
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDialog: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
  },
  infoTitle: {fontSize: 18, fontWeight: '700', marginBottom: 16},
  infoRow: {fontSize: 14, marginBottom: 8},
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {fontSize: 14, fontWeight: '600'},
});

export default SettingsScreen;
