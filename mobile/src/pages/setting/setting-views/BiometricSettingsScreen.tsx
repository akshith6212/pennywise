import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  BiometricCapability,
  BiometricService,
} from '../../../services/BiometricService';
import {createTimedAlert} from '../../../store/alertActions';
import {useAppTheme} from '../../../styles/theme';

const BiometricSettingsScreen: React.FC = () => {
  const theme = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cap, isOn] = await Promise.all([
      BiometricService.checkCapability(),
      BiometricService.isEnabled(),
    ]);
    setCapability(cap);
    setEnabled(isOn);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (value: boolean) => {
    if (value) {
      const success = await BiometricService.authenticate(
        'Verify identity to enable app lock',
      );
      if (!success) {
        createTimedAlert({
          type: 'error',
          message: 'Authentication failed. App lock was not enabled.',
        });
        return;
      }
    }
    setEnabled(value);
    await BiometricService.setEnabled(value);
    createTimedAlert({
      type: 'success',
      message: value ? 'App lock enabled.' : 'App lock disabled.',
    });
  };

  const handleTestBiometric = async () => {
    const success = await BiometricService.authenticate('Test biometric');
    createTimedAlert({
      type: success ? 'success' : 'error',
      message: success ? 'Authentication successful!' : 'Authentication failed.',
    });
  };

  const biometryIcon =
    capability?.biometryType === 'FaceID' ? 'face' : 'fingerprint';
  const biometryLabel =
    capability?.biometryType === 'FaceID'
      ? 'Face Unlock'
      : capability?.biometryType === 'Iris'
        ? 'Iris Scanner'
        : 'Fingerprint';

  if (loading) {
    return (
      <View style={[styles.centered, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      {/* Biometric icon */}
      <View style={styles.iconSection}>
        <View
          style={[
            styles.bigIcon,
            {backgroundColor: enabled ? theme.accentGreenSubtle : theme.bgTertiary},
          ]}>
          <Icon
            name={biometryIcon}
            size={48}
            color={enabled ? theme.accentGreen : theme.textLight}
          />
        </View>
        <Text style={[styles.statusText, {color: theme.textPrimary}]}>
          {enabled ? 'App Lock is On' : 'App Lock is Off'}
        </Text>
      </View>

      {!capability?.available ? (
        <View
          style={[
            styles.warningBanner,
            {backgroundColor: theme.accentYellowSubtle},
          ]}>
          <Icon name="warning" size={20} color={theme.accentYellow} />
          <Text style={[styles.warningText, {color: theme.textSecondary}]}>
            No biometric sensor found on this device. App lock requires
            fingerprint, face unlock, or iris scanner hardware.
          </Text>
        </View>
      ) : (
        <>
          {/* Toggle */}
          <View
            style={[
              styles.section,
              {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
            ]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Icon name={biometryIcon} size={22} color={theme.accentBlue} />
                <View style={styles.toggleLabels}>
                  <Text
                    style={[styles.toggleLabel, {color: theme.textPrimary}]}>
                    Require {biometryLabel}
                  </Text>
                  <Text
                    style={[styles.toggleHint, {color: theme.textMuted}]}>
                    Prompt when app comes to foreground
                  </Text>
                </View>
              </View>
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{false: '#ccc', true: theme.accentGreen}}
                thumbColor={theme.textWhite}
              />
            </View>
          </View>

          {/* Info */}
          <View
            style={[
              styles.infoBanner,
              {backgroundColor: theme.accentBlueSubtle},
            ]}>
            <Icon name="info-outline" size={18} color={theme.accentBlue} />
            <Text style={[styles.infoText, {color: theme.textSecondary}]}>
              When enabled, you'll need to verify your identity each time the
              app returns from the background. If biometric fails, your
              device's PIN or pattern is used as fallback.
            </Text>
          </View>

          {/* Test button */}
          {enabled && (
            <Pressable
              onPress={handleTestBiometric}
              style={({pressed}) => [
                styles.testButton,
                {backgroundColor: theme.accentBlue},
                pressed && {opacity: 0.8},
              ]}>
              <Icon name={biometryIcon} size={20} color={theme.textWhite} />
              <Text style={[styles.testButtonText, {color: theme.textWhite}]}>
                Test {biometryLabel}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* Setting location note */}
      <Text style={[styles.footerNote, {color: theme.textLight}]}>
        This setting is stored locally on this device and is not synced to
        your account.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  iconSection: {alignItems: 'center', paddingVertical: 32, gap: 12},
  bigIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {fontSize: 18, fontWeight: '700'},
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  toggleLabels: {flex: 1},
  toggleLabel: {fontSize: 15, fontWeight: '600'},
  toggleHint: {fontSize: 12, marginTop: 2},
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {fontSize: 13, flex: 1, lineHeight: 18},
  warningBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    alignItems: 'flex-start',
    marginHorizontal: 4,
  },
  warningText: {fontSize: 14, flex: 1, lineHeight: 20},
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  testButtonText: {fontSize: 15, fontWeight: '600'},
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});

export default BiometricSettingsScreen;
