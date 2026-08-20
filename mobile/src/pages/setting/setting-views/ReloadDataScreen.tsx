import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import {useNavigation} from '@react-navigation/native';

import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {LocalDB} from '../../../api/LocalDB';
import {getUnixTimestamp} from '../../../utility/utility';
import {createTimedAlert} from '../../../store/alertActions';
import {useAppTheme} from '../../../styles/theme';

const DATE_CHIPS = [
  {label: 'Today', value: () => dayjs()},
  {label: '1 Week Ago', value: () => dayjs().subtract(7, 'day')},
  {label: '1 Month Ago', value: () => dayjs().subtract(1, 'month')},
  {label: '3 Months Ago', value: () => dayjs().subtract(3, 'month')},
  {label: '6 Months Ago', value: () => dayjs().subtract(6, 'month')},
  {label: '1 Year Ago', value: () => dayjs().subtract(1, 'year')},
];

const ReloadDataScreen: React.FC = () => {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const selectedDate = DATE_CHIPS[selectedDateIndex].value();

  const handleReloadSelected = async () => {
    setLoading(true);
    try {
      await ExpenseAPI.getExpenseList(getUnixTimestamp(selectedDate.toDate()));
      await LocalDB.clearLocalDBData();
      createTimedAlert({
        type: 'success',
        message: `Expenses reloaded from ${selectedDate.format('MMM DD, YYYY')}`,
      });
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('Failed to reload expenses:', error);
      createTimedAlert({
        type: 'error',
        message: 'Failed to reload expenses. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReloadAll = async () => {
    setLoading(true);
    try {
      await ExpenseAPI.getExpenseList(getUnixTimestamp('2020-01-01'));
      createTimedAlert({
        type: 'success',
        message: 'All expenses reloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to reload all expenses:', error);
      createTimedAlert({
        type: 'error',
        message: 'Failed to reload expenses. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    try {
      await LocalDB.clearLocalDBData();
      createTimedAlert({type: 'success', message: 'Cache deleted successfully.'});
    } catch (error) {
      createTimedAlert({type: 'error', message: 'Clearing cache failed.'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Reload Section */}
        <View style={[styles.section, {backgroundColor: theme.bgCard, borderColor: theme.borderColor}]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Reload Expenses by Date
          </Text>

          <View style={styles.chipGrid}>
            {DATE_CHIPS.map((chip, index) => (
              <Pressable
                key={chip.label}
                onPress={() => setSelectedDateIndex(index)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedDateIndex === index
                        ? theme.accentBlue
                        : 'transparent',
                    borderColor:
                      selectedDateIndex === index
                        ? theme.accentBlue
                        : theme.borderColor,
                  },
                ]}>
                <Text
                  style={{
                    color:
                      selectedDateIndex === index
                        ? theme.textWhite
                        : theme.textPrimary,
                    fontSize: 13,
                    fontWeight: '500',
                  }}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleReloadSelected}
            disabled={loading}
            style={[styles.actionButton, {backgroundColor: theme.accentBlue}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.textWhite} />
            ) : (
              <Text style={[styles.actionButtonText, {color: theme.textWhite}]}>
                Reload from {selectedDate.format('MMM DD, YYYY')}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Reload All Section */}
        <View style={[styles.section, {backgroundColor: theme.bgCard, borderColor: theme.borderColor}]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Reload All Expenses
          </Text>
          <Text style={[styles.warningText, {color: theme.textMuted}]}>
            Caution: Reloading all expense data from Firebase can be costly.
            Repeated operations may significantly impact your billing due to
            increased Cloud Reads. Use this option sparingly.
          </Text>
          <Pressable
            onPress={handleReloadAll}
            disabled={loading}
            style={[styles.actionButton, {backgroundColor: theme.accentRed}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.textWhite} />
            ) : (
              <Text style={[styles.actionButtonText, {color: theme.textWhite}]}>
                Reload All Expenses
              </Text>
            )}
          </Pressable>
        </View>

        {/* Clear Cache Section */}
        <View style={[styles.section, {backgroundColor: theme.bgCard, borderColor: theme.borderColor}]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Clear Local Cache (SQLite)
          </Text>
          <Text style={[styles.warningText, {color: theme.textMuted}]}>
            Warning: This action completely erases all locally cached data
            including expenses, vendor tags, configurations, and budgets stored
            in your local SQLite database. This will force the app to reload all
            data from Firebase on next use.
          </Text>
          <Pressable
            onPress={handleClearCache}
            disabled={loading}
            style={[styles.actionButton, {backgroundColor: theme.accentYellow}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <Text style={[styles.actionButtonText, {color: '#333'}]}>
                Clear Cache
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollContent: {padding: 16, gap: 16, paddingBottom: 32},
  section: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  sectionTitle: {fontSize: 16, fontWeight: '600', marginBottom: 12},
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  warningText: {fontSize: 13, lineHeight: 18, marginBottom: 16},
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {fontSize: 14, fontWeight: '600'},
});

export default ReloadDataScreen;
