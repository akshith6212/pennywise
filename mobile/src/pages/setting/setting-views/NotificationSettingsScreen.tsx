import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';

import {selectExpense} from '../../../store/expenseActions';
import {
  NotificationPrefs,
  NotificationService,
} from '../../../services/NotificationService';
import {useAppTheme} from '../../../styles/theme';
import {Budget} from '../../../Types';

const NotificationSettingsScreen: React.FC = () => {
  const theme = useAppTheme();
  const {budgetList} = useSelector(selectExpense);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    const p = await NotificationService.getPrefs();
    setPrefs(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleGlobalToggle = async (value: boolean) => {
    if (!prefs) return;
    const updated = {...prefs, enabled: value};
    setPrefs(updated);
    await NotificationService.savePrefs(updated);
  };

  const handleBudgetToggle = async (budgetId: string, value: boolean) => {
    if (!prefs) return;
    const updated = {
      ...prefs,
      perBudget: {...prefs.perBudget, [budgetId]: value},
    };
    setPrefs(updated);
    await NotificationService.savePrefs(updated);
  };

  const isBudgetEnabled = (budgetId: string): boolean => {
    if (!prefs || !prefs.enabled) return false;
    return prefs.perBudget[budgetId] !== false;
  };

  const renderBudgetItem = ({item}: {item: Budget}) => (
    <View style={styles.budgetRow}>
      <View style={styles.budgetInfo}>
        <Text style={[styles.budgetName, {color: theme.textPrimary}]}>
          {item.name}
        </Text>
        <Text style={[styles.budgetAmount, {color: theme.textMuted}]}>
          ₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </View>
      <Switch
        value={isBudgetEnabled(item.id)}
        onValueChange={v => handleBudgetToggle(item.id, v)}
        disabled={!prefs?.enabled}
        trackColor={{false: '#ccc', true: theme.accentPurple}}
        thumbColor={theme.textWhite}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      {/* Global toggle */}
      <View
        style={[
          styles.section,
          {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
        ]}>
        <View style={styles.globalRow}>
          <View style={styles.globalInfo}>
            <Icon name="notifications" size={22} color={theme.accentBlue} />
            <Text style={[styles.globalLabel, {color: theme.textPrimary}]}>
              Budget Notifications
            </Text>
          </View>
          <Switch
            value={prefs?.enabled ?? true}
            onValueChange={handleGlobalToggle}
            trackColor={{false: '#ccc', true: theme.accentBlue}}
            thumbColor={theme.textWhite}
          />
        </View>
        <Text style={[styles.globalHint, {color: theme.textMuted}]}>
          Get notified when budgets reach 85% or exceed their limit.
        </Text>
      </View>

      {/* Info banner */}
      <View
        style={[
          styles.infoBanner,
          {backgroundColor: theme.accentBlueSubtle},
        ]}>
        <Icon name="info-outline" size={18} color={theme.accentBlue} />
        <Text style={[styles.infoText, {color: theme.textSecondary}]}>
          Notifications are checked each time expenses sync. Alerts fire once
          per threshold per month.
        </Text>
      </View>

      {/* Per-budget toggles */}
      <Text style={[styles.sectionTitle, {color: theme.textMuted}]}>
        PER-BUDGET SETTINGS
      </Text>

      {budgetList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="account-balance-wallet"
            size={48}
            color={theme.textLight}
          />
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            No budgets configured yet.{'\n'}Add budgets in the Budget tab.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.listContainer,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <FlatList
            data={budgetList}
            keyExtractor={item => item.id}
            renderItem={renderBudgetItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.separator,
                  {backgroundColor: theme.borderColor},
                ]}
              />
            )}
          />
        </View>
      )}

      {/* Reset button */}
      <Pressable
        onPress={async () => {
          await NotificationService.resetMonthlyState();
        }}
        style={({pressed}) => [
          styles.resetButton,
          {borderColor: theme.borderColor},
          pressed && {opacity: 0.7},
        ]}>
        <Icon name="restart-alt" size={18} color={theme.textMuted} />
        <Text style={[styles.resetText, {color: theme.textMuted}]}>
          Reset notification history for this month
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  globalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  globalInfo: {flexDirection: 'row', alignItems: 'center', gap: 10},
  globalLabel: {fontSize: 16, fontWeight: '600'},
  globalHint: {fontSize: 13, marginTop: 8},
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {fontSize: 13, flex: 1, lineHeight: 18},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  budgetInfo: {flex: 1},
  budgetName: {fontSize: 15, fontWeight: '500'},
  budgetAmount: {fontSize: 13, marginTop: 2},
  separator: {height: StyleSheet.hairlineWidth},
  emptyContainer: {alignItems: 'center', paddingVertical: 40, gap: 12},
  emptyText: {fontSize: 14, textAlign: 'center', lineHeight: 20},
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetText: {fontSize: 13},
});

export default NotificationSettingsScreen;
