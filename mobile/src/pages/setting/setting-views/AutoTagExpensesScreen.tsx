import React, {useEffect, useState} from 'react';
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

import {ExpenseAPI} from '../../../api/ExpenseAPI';
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

const AutoTagExpensesScreen: React.FC = () => {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const selectedDate = DATE_CHIPS[selectedDateIndex].value();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
        setProcessedCount(0);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleAutoTagSelected = async () => {
    setLoading(true);
    try {
      const count = await ExpenseAPI.autoTagPastExpenses(
        getUnixTimestamp(selectedDate.toDate()),
      );
      setProcessedCount(count);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to auto-tag expenses:', error);
      createTimedAlert({type: 'error', message: 'Failed to auto-tag expenses.'});
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTagAll = async () => {
    setLoading(true);
    try {
      const count = await ExpenseAPI.autoTagPastExpenses(
        getUnixTimestamp('2020-01-01'),
      );
      setProcessedCount(count);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to auto-tag all expenses:', error);
      createTimedAlert({type: 'error', message: 'Failed to auto-tag expenses.'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info banner */}
        <View
          style={[
            styles.infoBanner,
            {backgroundColor: theme.accentBlueSubtle, borderColor: theme.accentBlue},
          ]}>
          <Icon name="info-outline" size={18} color={theme.accentBlue} />
          <Text style={[styles.infoText, {color: theme.textSecondary}]}>
            This feature automatically assigns tags to your past expenses based
            on vendor names in 'Manage Vendor Tags'. It helps organize old
            expenses without manual tagging.
          </Text>
        </View>

        {/* Date Specific Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Auto-tag Expenses by Date
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
            onPress={handleAutoTagSelected}
            disabled={loading}
            style={[styles.actionButton, {backgroundColor: theme.accentBlue}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.textWhite} />
            ) : (
              <Text style={[styles.actionButtonText, {color: theme.textWhite}]}>
                Auto-tag from {selectedDate.format('MMM DD, YYYY')}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Auto-tag All Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Auto-tag All Past Expenses
          </Text>
          <Text style={[styles.warningText, {color: theme.textMuted}]}>
            This action will go through all past expenses and apply tags based on
            your vendor-tag mappings available in 'Manage Vendor Tags'.
          </Text>
          <Pressable
            onPress={handleAutoTagAll}
            disabled={loading}
            style={[styles.actionButton, {backgroundColor: theme.accentRed}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.textWhite} />
            ) : (
              <Text style={[styles.actionButtonText, {color: theme.textWhite}]}>
                Auto-tag All Expenses
              </Text>
            )}
          </Pressable>
        </View>

        {/* Success Message */}
        {success && (
          <View
            style={[
              styles.successBanner,
              {
                backgroundColor: theme.accentGreenSubtle,
                borderColor: theme.accentGreen,
              },
            ]}>
            <Icon name="check-circle" size={20} color={theme.accentGreen} />
            <Text style={[styles.successText, {color: theme.textPrimary}]}>
              Auto-tagging successful! {processedCount} expenses were updated.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollContent: {padding: 16, gap: 16, paddingBottom: 32},
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {flex: 1, fontSize: 13, lineHeight: 18},
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  successText: {flex: 1, fontSize: 13, fontWeight: '500'},
});

export default AutoTagExpensesScreen;
