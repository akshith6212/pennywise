import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {ReminderPrefs, ReminderService} from '../../../services/ReminderService';
import {createTimedAlert} from '../../../store/alertActions';
import {useAppTheme} from '../../../styles/theme';

const HOURS = Array.from({length: 24}, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const ReminderSettingsScreen: React.FC = () => {
  const theme = useAppTheme();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const load = useCallback(async () => {
    const p = await ReminderService.getPrefs();
    setPrefs(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (value: boolean) => {
    if (!prefs) return;
    const updated = {...prefs, enabled: value};
    setPrefs(updated);
    await ReminderService.savePrefs(updated);
    createTimedAlert({
      type: 'success',
      message: value
        ? `Daily reminder set for ${ReminderService.formatTime(updated.hour, updated.minute)}.`
        : 'Daily reminder disabled.',
    });
  };

  const handleTimeSelect = async (hour: number, minute: number) => {
    if (!prefs) return;
    const updated = {...prefs, hour, minute};
    setPrefs(updated);
    setShowTimePicker(false);
    if (updated.enabled) {
      await ReminderService.savePrefs(updated);
      createTimedAlert({
        type: 'success',
        message: `Reminder time updated to ${ReminderService.formatTime(hour, minute)}.`,
      });
    }
  };

  if (loading || !prefs) {
    return (
      <View style={[styles.centered, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      {/* Icon section */}
      <View style={styles.iconSection}>
        <View
          style={[
            styles.bigIcon,
            {
              backgroundColor: prefs.enabled
                ? theme.accentBlueSubtle
                : theme.bgTertiary,
            },
          ]}>
          <Icon
            name="notifications-active"
            size={44}
            color={prefs.enabled ? theme.accentBlue : theme.textLight}
          />
        </View>
        <Text style={[styles.statusText, {color: theme.textPrimary}]}>
          Daily Expense Reminder
        </Text>
        <Text style={[styles.statusHint, {color: theme.textMuted}]}>
          Get a daily nudge to log your expenses
        </Text>
      </View>

      {/* Enable toggle */}
      <View
        style={[
          styles.section,
          {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
        ]}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Icon name="alarm" size={22} color={theme.accentBlue} />
            <Text style={[styles.rowLabel, {color: theme.textPrimary}]}>
              Enable Reminder
            </Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={handleToggle}
            trackColor={{false: '#ccc', true: theme.accentBlue}}
            thumbColor={theme.textWhite}
          />
        </View>
      </View>

      {/* Time selection */}
      <View
        style={[
          styles.section,
          {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
        ]}>
        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={({pressed}) => [styles.row, pressed && {opacity: 0.7}]}>
          <View style={styles.rowInfo}>
            <Icon name="schedule" size={22} color={theme.accentPurple} />
            <View>
              <Text style={[styles.rowLabel, {color: theme.textPrimary}]}>
                Reminder Time
              </Text>
              <Text style={[styles.rowHint, {color: theme.textMuted}]}>
                {ReminderService.formatTime(prefs.hour, prefs.minute)}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={22} color={theme.textLight} />
        </Pressable>
      </View>

      {/* Info */}
      <View
        style={[
          styles.infoBanner,
          {backgroundColor: theme.accentBlueSubtle},
        ]}>
        <Icon name="info-outline" size={18} color={theme.accentBlue} />
        <Text style={[styles.infoText, {color: theme.textSecondary}]}>
          Tapping the notification opens the Add Expense screen directly.
        </Text>
      </View>

      {/* Time picker modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setShowTimePicker(false)}>
          <Pressable
            style={[styles.pickerSheet, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.pickerTitle, {color: theme.textPrimary}]}>
              Select Time
            </Text>
            <ScrollView style={styles.pickerScroll}>
              {HOURS.map(h =>
                MINUTES.map(m => {
                  const isSelected = h === prefs.hour && m === prefs.minute;
                  return (
                    <Pressable
                      key={`${h}-${m}`}
                      onPress={() => handleTimeSelect(h, m)}
                      style={[
                        styles.timeOption,
                        isSelected && {
                          backgroundColor: theme.accentBlueSubtle,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: isSelected
                              ? theme.accentBlue
                              : theme.textPrimary,
                            fontWeight: isSelected ? '700' : '400',
                          },
                        ]}>
                        {ReminderService.formatTime(h, m)}
                      </Text>
                      {isSelected && (
                        <Icon
                          name="check"
                          size={20}
                          color={theme.accentBlue}
                        />
                      )}
                    </Pressable>
                  );
                }),
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  iconSection: {alignItems: 'center', paddingVertical: 24, gap: 8},
  bigIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {fontSize: 18, fontWeight: '700'},
  statusHint: {fontSize: 13},
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInfo: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowLabel: {fontSize: 15, fontWeight: '600'},
  rowHint: {fontSize: 12, marginTop: 2},
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  infoText: {fontSize: 13, flex: 1, lineHeight: 18},
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: {fontSize: 18, fontWeight: '700', marginBottom: 16},
  pickerScroll: {flexGrow: 0},
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeText: {fontSize: 16},
});

export default ReminderSettingsScreen;
