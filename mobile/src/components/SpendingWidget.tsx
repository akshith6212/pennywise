import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {WidgetData, WidgetService} from '../services/WidgetService';

interface SpendingWidgetProps {
  data: WidgetData;
  darkMode?: boolean;
}

const SpendingWidget: React.FC<SpendingWidgetProps> = ({
  data,
  darkMode = false,
}) => {
  const colors = darkMode
    ? {bg: '#23272a', text: '#e0e0e0', muted: '#9e9e9e', accent: '#90caf9'}
    : {bg: '#ffffff', text: '#212529', muted: '#6c757d', accent: '#1c75bd'};

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      <View style={styles.header}>
        <Icon
          name="account-balance-wallet"
          size={20}
          color={colors.accent}
        />
        <Text style={[styles.appName, {color: colors.muted}]}>Pennywise</Text>
      </View>

      <Text style={[styles.amount, {color: colors.text}]}>
        {WidgetService.formatCurrency(data.monthlySpent)}
      </Text>

      <Text style={[styles.label, {color: colors.muted}]}>
        spent in {data.monthLabel}
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.count, {color: colors.muted}]}>
          {data.transactionCount} transaction
          {data.transactionCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  appName: {fontSize: 12, fontWeight: '500'},
  amount: {fontSize: 28, fontWeight: '700', marginBottom: 4},
  label: {fontSize: 13, marginBottom: 12},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {fontSize: 11},
});

export default SpendingWidget;
