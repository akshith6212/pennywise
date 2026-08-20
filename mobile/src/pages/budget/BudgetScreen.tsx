import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';
import dayjs from 'dayjs';

import {selectExpense} from '../../store/expenseActions';
import {Budget, BudgetProgress, Expense, MonthYear} from '../../Types';
import {isEmpty} from '../../utility/utility';
import {useAppTheme} from '../../styles/theme';

import EditBudgetModal from './EditBudget';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const BudgetScreen: React.FC = () => {
  const theme = useAppTheme();
  const {expenseList, budgetList, isAppLoading} = useSelector(selectExpense);

  const [selectedMonth, setSelectedMonth] = useState<MonthYear | null>(null);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterYear, setFilterYear] = useState<number>(dayjs().year());

  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const currentDate = dayjs();

  useEffect(() => {
    const option: MonthYear = {
      month: currentDate.month(),
      year: currentDate.year(),
      label: `${MONTH_NAMES[currentDate.month()]} ${currentDate.year()}`,
      value: `${currentDate.year()}-${String(currentDate.month() + 1).padStart(2, '0')}`,
    };
    setSelectedMonth(option);
  }, []);

  const filterExpensesByMonth = useCallback(
    (expenses: Expense[], monthYear: MonthYear): Expense[] => {
      return expenses.filter(expense => {
        const expenseDate = dayjs(new Date(expense.date));
        return (
          expenseDate.year() === monthYear.year &&
          expenseDate.month() === monthYear.month
        );
      });
    },
    [],
  );

  const calculateBudgetProgress = useCallback(
    (expenses: Expense[], budgets: Budget[]): BudgetProgress[] => {
      return budgets.map(budget => {
        let spent: number;
        if (budget.tagList.includes('All')) {
          spent = expenses
            .filter(e => e.costType === 'debit')
            .reduce((sum, e) => sum + e.cost, 0);
        } else {
          spent = expenses
            .filter(e => !isEmpty(e.tag))
            .filter(e => e.costType === 'debit')
            .filter(e =>
              budget.tagList.some(
                tag => e.tag?.toLowerCase() === tag.toLowerCase(),
              ),
            )
            .reduce((sum, e) => sum + e.cost, 0);
        }
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = (spent / budget.amount) * 100;
        return {budget, spent, remaining, percentage};
      });
    },
    [],
  );

  useEffect(() => {
    if (expenseList.length > 0 && budgetList.length > 0 && selectedMonth) {
      const filtered = filterExpensesByMonth(expenseList, selectedMonth);
      const progress = calculateBudgetProgress(filtered, budgetList);
      setBudgetProgress(progress);
    } else if (budgetList.length === 0) {
      setBudgetProgress([]);
    }
  }, [
    expenseList,
    budgetList,
    selectedMonth,
    filterExpensesByMonth,
    calculateBudgetProgress,
  ]);

  const getProgressColor = (percentage: number) => {
    if (percentage <= 85) return theme.accentGreen;
    if (percentage <= 100) return theme.accentYellow;
    return theme.accentRed;
  };

  const formatCurrency = (amount: number): string => {
    return '₹' + amount.toLocaleString('en-IN', {maximumFractionDigits: 0});
  };

  const handleBudgetCardPress = (budget: Budget) => {
    setSelectedBudget(budget);
    setEditBudgetOpen(true);
  };

  const handleBudgetUpdated = () => {
    setSelectedBudget(null);
    setEditBudgetOpen(false);
  };

  const handleBudgetDeleted = (_budgetId: string) => {
    setSelectedBudget(null);
    setEditBudgetOpen(false);
  };

  const handleMonthSelect = (month: MonthYear) => {
    setSelectedMonth(month);
    setShowFilterPanel(false);
  };

  const years = useMemo(() => {
    const cy = currentDate.year();
    return [cy, cy - 1, cy - 2];
  }, [currentDate]);

  const monthOptions = useMemo((): MonthYear[] => {
    const maxMonth =
      filterYear === currentDate.year() ? currentDate.month() : 11;
    const options: MonthYear[] = [];
    for (let m = 0; m <= maxMonth; m++) {
      options.push({
        month: m,
        year: filterYear,
        label: `${MONTH_NAMES[m]} ${filterYear}`,
        value: `${filterYear}-${String(m + 1).padStart(2, '0')}`,
      });
    }
    return options;
  }, [filterYear, currentDate]);

  if (isAppLoading) {
    return (
      <View
        style={[styles.loadingContainer, {backgroundColor: theme.bgPrimary}]}>
        <Text style={[styles.loadingText, {color: theme.textMuted}]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageTitle, {color: theme.textPrimary}]}>
          Budget Overview
        </Text>

        {budgetProgress.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="account-balance-wallet"
              size={48}
              color={theme.textLight}
            />
            <Text style={[styles.emptyTitle, {color: theme.textSecondary}]}>
              No budget data available
            </Text>
            <Text style={[styles.emptySubtitle, {color: theme.textMuted}]}>
              {selectedMonth
                ? `No budgets for ${selectedMonth.label}`
                : 'Select a month to view budget progress'}
            </Text>
          </View>
        ) : (
          budgetProgress.map((progress, index) => (
            <Pressable
              key={progress.budget.id || index}
              onPress={() => handleBudgetCardPress(progress.budget)}
              style={[
                styles.budgetCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderColor,
                },
              ]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.budgetName, {color: theme.textPrimary}]}
                  numberOfLines={1}>
                  {progress.budget.name}
                </Text>
                <Text
                  style={[styles.budgetAmount, {color: theme.textSecondary}]}>
                  {formatCurrency(progress.budget.amount)}
                </Text>
              </View>

              {/* Progress info */}
              <View style={styles.progressInfo}>
                <Text style={[styles.spentText, {color: theme.textPrimary}]}>
                  Spent: {formatCurrency(progress.spent)}
                </Text>
                <Text
                  style={[
                    styles.remainingText,
                    {color: theme.textSecondary},
                  ]}>
                  Remaining: {formatCurrency(progress.remaining)}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarBg,
                    {backgroundColor: theme.bgTertiary},
                  ]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, progress.percentage)}%`,
                        backgroundColor: getProgressColor(
                          progress.percentage,
                        ),
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.percentageText,
                    {color: getProgressColor(progress.percentage)},
                  ]}>
                  {progress.percentage.toFixed(1)}%
                </Text>
              </View>

              {/* Tags */}
              <View style={styles.tagRow}>
                {progress.budget.tagList.map((tag, tagIndex) => (
                  <View
                    key={tagIndex}
                    style={[
                      styles.tagChip,
                      {borderColor: theme.borderColor},
                    ]}>
                    <Text
                      style={[
                        styles.tagChipText,
                        {color: theme.textSecondary},
                      ]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {backgroundColor: theme.bgCard, borderTopColor: theme.borderColor},
        ]}>
        <Pressable
          onPress={() => setShowFilterPanel(true)}
          style={[styles.chipButton, {backgroundColor: theme.accentBlue}]}>
          <Icon name="filter-list" size={16} color={theme.textWhite} />
          <Text style={[styles.chipText, {color: theme.textWhite}]}>
            {selectedMonth ? selectedMonth.label : 'Select Month'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setSelectedBudget(null);
            setEditBudgetOpen(true);
          }}
          style={[styles.fab, {backgroundColor: theme.accentBlue}]}>
          <Icon name="add" size={28} color={theme.textWhite} />
        </Pressable>
      </View>

      {/* Month Filter Panel */}
      <Modal
        visible={showFilterPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterPanel(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setShowFilterPanel(false)}>
          <View style={[styles.panel, {backgroundColor: theme.bgCard}]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, {color: theme.textPrimary}]}>
                Filter by date & year
              </Text>
              <Pressable onPress={() => setShowFilterPanel(false)}>
                <Icon name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Year */}
            <Text
              style={[styles.sectionTitle, {color: theme.textSecondary}]}>
              Year
            </Text>
            <View style={styles.chipGrid}>
              {years.map(year => (
                <Pressable
                  key={year}
                  onPress={() => setFilterYear(year)}
                  style={[
                    styles.panelChip,
                    {
                      backgroundColor:
                        filterYear === year
                          ? theme.accentBlue
                          : 'transparent',
                      borderColor:
                        filterYear === year
                          ? theme.accentBlue
                          : theme.borderColor,
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        filterYear === year
                          ? theme.textWhite
                          : theme.textPrimary,
                      fontSize: 13,
                      fontWeight: '500',
                    }}>
                    {year}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Month */}
            <Text
              style={[styles.sectionTitle, {color: theme.textSecondary}]}>
              Month
            </Text>
            <View style={styles.chipGrid}>
              {monthOptions.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => handleMonthSelect(option)}
                  style={[
                    styles.panelChip,
                    {
                      backgroundColor:
                        selectedMonth?.value === option.value
                          ? theme.accentBlue
                          : 'transparent',
                      borderColor:
                        selectedMonth?.value === option.value
                          ? theme.accentBlue
                          : theme.borderColor,
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        selectedMonth?.value === option.value
                          ? theme.textWhite
                          : theme.textPrimary,
                      fontSize: 13,
                      fontWeight: '500',
                    }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Budget Modal */}
      <EditBudgetModal
        visible={editBudgetOpen}
        onClose={() => setEditBudgetOpen(false)}
        budget={selectedBudget}
        onBudgetUpdated={handleBudgetUpdated}
        onBudgetDeleted={handleBudgetDeleted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {fontSize: 16},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 100},
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {fontSize: 16, fontWeight: '600'},
  emptySubtitle: {fontSize: 13},
  budgetCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetName: {fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8},
  budgetAmount: {fontSize: 14, fontWeight: '600'},
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentText: {fontSize: 13},
  remainingText: {fontSize: 13},
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {fontSize: 13, fontWeight: '600', width: 48, textAlign: 'right'},
  tagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagChipText: {fontSize: 11, fontWeight: '500'},
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {fontSize: 12, fontWeight: '600'},
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {fontSize: 16, fontWeight: '600'},
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  panelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});

export default BudgetScreen;
