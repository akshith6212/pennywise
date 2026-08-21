import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';

import {Expense} from '../../Types';
import {selectExpense} from '../../store/expenseActions';
import {
  CalculationOption,
  calculationOptions,
  DateRange,
  filterExpensesByDate,
  filterOptions,
  GroupByOption,
  groupByOptions,
} from '../dataValidations';
import {useAppTheme} from '../../styles/theme';
import {CHART_COLORS} from '../../utility/constants';
import {createTimedAlert} from '../../store/alertActions';

import LineChart from './LineChart';
import PieChart from './PieChart';
import {exportAsCSV} from './exportReport';

interface LineDataPoint {
  date: string;
  [key: string]: string | number;
}

const InsightsScreen: React.FC = () => {
  const theme = useAppTheme();
  const {expenseList: expenses, isAppLoading: isLoading} =
    useSelector(selectExpense);
  const [timeRange, setTimeRange] = useState<DateRange>('30d');
  const [selectedGroupBy, setSelectedGroupBy] = useState<GroupByOption>('days');
  const [selectedCalculation, setSelectedCalculation] =
    useState<CalculationOption>('median');

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupByPanel, setShowGroupByPanel] = useState(false);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filteredExpenses = useMemo(
    () => filterExpensesByDate(expenses, timeRange),
    [expenses, timeRange],
  );

  const getTotalSpending = useCallback(() => {
    return filteredExpenses
      .reduce((sum, expense) => sum + Number(expense.cost), 0)
      .toFixed(2);
  }, [filteredExpenses]);

  const getAverageDailySpending = useCallback(() => {
    if (filteredExpenses.length === 0) return '0.00';
    const expensesByDay = new Map<string, number>();
    filteredExpenses.forEach(expense => {
      const dayKey = new Date(expense.date).toLocaleDateString();
      const current = expensesByDay.get(dayKey) || 0;
      expensesByDay.set(dayKey, current + Number(expense.cost));
    });
    const dailyTotals = Array.from(expensesByDay.values());
    if (selectedCalculation === 'average') {
      const total = dailyTotals.reduce((sum, t) => sum + t, 0);
      return (total / Math.max(dailyTotals.length, 1)).toFixed(2);
    }
    const sorted = [...dailyTotals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return median.toFixed(2);
  }, [filteredExpenses, selectedCalculation]);

  const getAverageMonthlySpending = useCallback(() => {
    if (filteredExpenses.length === 0) return '0.00';
    const isMonthOrLess = timeRange === '7d' || timeRange === '30d';
    if (isMonthOrLess) return getAverageDailySpending();
    const expensesByMonth = new Map<string, number>();
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const current = expensesByMonth.get(monthKey) || 0;
      expensesByMonth.set(monthKey, current + Number(expense.cost));
    });
    const monthlyTotals = Array.from(expensesByMonth.values());
    if (selectedCalculation === 'average') {
      const total = monthlyTotals.reduce((sum, t) => sum + t, 0);
      return (total / Math.max(monthlyTotals.length, 1)).toFixed(2);
    }
    const sorted = [...monthlyTotals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return median.toFixed(2);
  }, [filteredExpenses, selectedCalculation, timeRange, getAverageDailySpending]);

  const getCostRange = useCallback((cost: number): string => {
    if (cost <= 100) return '₹0-₹100';
    if (cost <= 500) return '₹100-₹500';
    if (cost <= 1000) return '₹500-₹1000';
    return '₹1000+';
  }, []);

  const availableItems = useMemo(() => {
    if (selectedGroupBy === 'days') return [];
    const getGroupKey = (expense: Expense): string => {
      if (selectedGroupBy === 'vendor') return expense.vendor;
      if (selectedGroupBy === 'tags') return expense.tag || 'Untagged';
      if (selectedGroupBy === 'cost') return getCostRange(expense.cost);
      return '';
    };
    const groupMetrics = new Map<string, number>();
    filteredExpenses.forEach(expense => {
      const key = getGroupKey(expense);
      if (key) {
        groupMetrics.set(key, (groupMetrics.get(key) || 0) + Number(expense.cost));
      }
    });
    let groups = Array.from(groupMetrics.keys());
    groups.sort((a, b) => (groupMetrics.get(b) || 0) - (groupMetrics.get(a) || 0));
    if (selectedGroupBy === 'tags') {
      groups = groups.filter(g => g !== 'Untagged');
    }
    return groups;
  }, [filteredExpenses, selectedGroupBy, getCostRange]);

  useEffect(() => {
    if (selectedGroupBy !== 'days' && selectedItems.length === 0 && availableItems.length > 0) {
      setSelectedItems(availableItems.slice(0, 5));
    }
    if (selectedGroupBy === 'days') {
      setSelectedItems([]);
    }
  }, [selectedGroupBy, availableItems]);

  const chartData = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return {lineChartData: [], pieChartData: [], lineKeys: []};
    }

    const expensesByDate = new Map<string, Expense[]>();
    filteredExpenses.forEach(expense => {
      const dateStr = new Date(expense.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!expensesByDate.has(dateStr)) {
        expensesByDate.set(dateStr, []);
      }
      expensesByDate.get(dateStr)!.push(expense);
    });

    if (selectedGroupBy === 'days') {
      const lineChartData: LineDataPoint[] = [];
      Array.from(expensesByDate.entries()).forEach(([date, dateExpenses]) => {
        const totalCost = dateExpenses.reduce(
          (sum, exp) => sum + Number(exp.cost),
          0,
        );
        lineChartData.push({date, 'Daily Total': totalCost});
      });
      lineChartData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return {lineChartData, pieChartData: [], lineKeys: ['Daily Total']};
    }

    const getGroupKey = (expense: Expense): string => {
      if (selectedGroupBy === 'vendor') return expense.vendor;
      if (selectedGroupBy === 'tags') return expense.tag || 'Untagged';
      if (selectedGroupBy === 'cost') return getCostRange(expense.cost);
      return '';
    };

    const groupMetrics = new Map<string, number[]>();
    filteredExpenses.forEach(expense => {
      const key = getGroupKey(expense);
      if (key) {
        if (!groupMetrics.has(key)) groupMetrics.set(key, []);
        groupMetrics.get(key)!.push(Number(expense.cost));
      }
    });

    let targetGroups: string[];
    if (selectedItems.length > 0) {
      targetGroups = selectedItems.filter(item => groupMetrics.has(item));
    } else {
      let groups = Array.from(groupMetrics.keys());
      groups.sort((a, b) => {
        const totalA = (groupMetrics.get(a) ?? []).reduce((s, v) => s + v, 0);
        const totalB = (groupMetrics.get(b) ?? []).reduce((s, v) => s + v, 0);
        return totalB - totalA;
      });
      if (selectedGroupBy === 'tags') {
        groups = groups.filter(g => g !== 'Untagged');
      }
      targetGroups = groups.slice(0, 5);
    }

    const pieChartData = targetGroups.map(group => {
      const values = groupMetrics.get(group) ?? [0];
      return {
        name: group,
        value: values.reduce((s, v) => s + v, 0),
      };
    });

    const dates = Array.from(expensesByDate.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const lineChartData = dates.map((date, index) => {
      const dataPoint: LineDataPoint = {date};
      targetGroups.forEach(group => {
        const rollingDates = dates.slice(Math.max(0, index - 6), index + 1);
        const groupValues: number[] = [];
        rollingDates.forEach(rollingDate => {
          const dateExpenses = expensesByDate.get(rollingDate) || [];
          dateExpenses.forEach(expense => {
            if (getGroupKey(expense) === group) {
              groupValues.push(Number(expense.cost));
            }
          });
        });
        if (groupValues.length > 0) {
          if (selectedCalculation === 'average') {
            dataPoint[group] =
              groupValues.reduce((s, v) => s + v, 0) / groupValues.length;
          } else {
            const sorted = [...groupValues].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            dataPoint[group] =
              sorted.length % 2 !== 0
                ? sorted[mid]
                : (sorted[mid - 1] + sorted[mid]) / 2;
          }
        } else {
          dataPoint[group] = 0;
        }
      });
      return dataPoint;
    });

    return {lineChartData, pieChartData, lineKeys: targetGroups};
  }, [filteredExpenses, selectedGroupBy, selectedCalculation, selectedItems, getCostRange]);

  const handleRangeChange = (range: DateRange) => {
    setTimeRange(range);
    setShowFilterPanel(false);
  };

  const handleGroupByChange = (option: GroupByOption) => {
    setSelectedGroupBy(option);
    setSelectedItems([]);
    setShowGroupByPanel(false);
  };

  const handleCalculationChange = (option: CalculationOption) => {
    setSelectedCalculation(option);
    setShowGroupByPanel(false);
  };

  const handleItemToggle = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleExportCSV = () => {
    exportAsCSV(filteredExpenses, timeRange);
    createTimedAlert({message: 'CSV export started', type: 'success'});
  };

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  const calcLabel =
    selectedCalculation === 'average' ? 'Average' : 'Median';
  const isShortRange = timeRange === '7d' || timeRange === '30d';
  const monthSubLabel = isShortRange ? 'Per Day' : 'Per Month';

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={[styles.pageTitle, {color: theme.textPrimary}]}>
          Expense Insights
        </Text>

        {/* Summary Cards */}
        <View style={[styles.totalCard, {backgroundColor: theme.accentBlue}]}>
          <Text style={styles.cardLabel}>Total Spending</Text>
          <Text style={styles.cardValue}>₹{getTotalSpending()}</Text>
          <View style={styles.cardFooter}>
            <Icon
              name="trending-up"
              size={14}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.cardFooterText}>
              {filterOptions.find(o => o.id === timeRange)?.label}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View
            style={[styles.summaryCard, {backgroundColor: theme.accentGreen}]}>
            <Text style={styles.cardLabel}>Daily {calcLabel}</Text>
            <Text style={styles.cardValueSmall}>
              ₹{getAverageDailySpending()}
            </Text>
            <View style={styles.cardFooter}>
              <Icon
                name="trending-down"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.cardFooterText}>Per Day</Text>
            </View>
          </View>

          <View
            style={[
              styles.summaryCard,
              {backgroundColor: theme.accentPurple},
            ]}>
            <Text style={styles.cardLabel}>
              {isShortRange ? `Daily ${calcLabel}` : `Monthly ${calcLabel}`}
            </Text>
            <Text style={styles.cardValueSmall}>
              ₹{getAverageMonthlySpending()}
            </Text>
            <View style={styles.cardFooter}>
              <Icon
                name="trending-down"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.cardFooterText}>{monthSubLabel}</Text>
            </View>
          </View>
        </View>

        {/* Charts */}
        {selectedGroupBy === 'days' ? (
          <LineChart
            data={chartData.lineChartData}
            lineKeys={chartData.lineKeys}
            title="Spending Trends"
          />
        ) : (
          <PieChart
            data={chartData.pieChartData}
            title="Group Distribution"
            onSelectionToggle={() => setShowSelectionPanel(true)}
          />
        )}

        {/* Export */}
        <Text style={[styles.infoBanner, {color: theme.textMuted}]}>
          Reports are based on the selected range:{' '}
          <Text style={{fontWeight: '700', color: theme.textPrimary}}>
            {filterOptions.find(o => o.id === timeRange)?.label}
          </Text>
        </Text>

        <Pressable
          onPress={handleExportCSV}
          style={[
            styles.exportButton,
            {backgroundColor: theme.accentBlue},
          ]}>
          <Icon name="file-download" size={20} color={theme.textWhite} />
          <Text style={[styles.exportButtonText, {color: theme.textWhite}]}>
            Export CSV
          </Text>
        </Pressable>
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {backgroundColor: theme.bgCard, borderTopColor: theme.borderColor},
        ]}>
        <Pressable
          onPress={() => {
            setShowFilterPanel(true);
            setShowGroupByPanel(false);
          }}
          style={[styles.chipButton, {backgroundColor: theme.accentBlue}]}>
          <Icon name="filter-list" size={16} color={theme.textWhite} />
          <Text style={[styles.chipText, {color: theme.textWhite}]}>
            {filterOptions.find(o => o.id === timeRange)?.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setShowGroupByPanel(true);
            setShowFilterPanel(false);
          }}
          style={[styles.chipButton, {backgroundColor: theme.accentBlue}]}>
          <Icon name="sort" size={16} color={theme.textWhite} />
          <Text style={[styles.chipText, {color: theme.textWhite}]}>
            {groupByOptions.find(o => o.id === selectedGroupBy)?.label}
          </Text>
        </Pressable>
      </View>

      {/* Filter Panel */}
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
                Filter by date range
              </Text>
              <Pressable onPress={() => setShowFilterPanel(false)}>
                <Icon name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <View style={styles.chipGrid}>
              {filterOptions.map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => handleRangeChange(option.id)}
                  style={[
                    styles.panelChip,
                    {
                      backgroundColor:
                        timeRange === option.id
                          ? theme.accentBlue
                          : 'transparent',
                      borderColor:
                        timeRange === option.id
                          ? theme.accentBlue
                          : theme.borderColor,
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        timeRange === option.id
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

      {/* Group By / Calculation Panel */}
      <Modal
        visible={showGroupByPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupByPanel(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setShowGroupByPanel(false)}>
          <View style={[styles.panel, {backgroundColor: theme.bgCard}]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, {color: theme.textPrimary}]}>
                Insights Options
              </Text>
              <Pressable onPress={() => setShowGroupByPanel(false)}>
                <Icon name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
              Group by
            </Text>
            <View style={styles.chipGrid}>
              {groupByOptions.map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => handleGroupByChange(option.id)}
                  style={[
                    styles.panelChip,
                    {
                      backgroundColor:
                        selectedGroupBy === option.id
                          ? theme.accentBlue
                          : 'transparent',
                      borderColor:
                        selectedGroupBy === option.id
                          ? theme.accentBlue
                          : theme.borderColor,
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        selectedGroupBy === option.id
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

            <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
              Calculation
            </Text>
            <View style={styles.chipGrid}>
              {calculationOptions.map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => handleCalculationChange(option.id)}
                  style={[
                    styles.panelChip,
                    {
                      backgroundColor:
                        selectedCalculation === option.id
                          ? theme.accentBlue
                          : 'transparent',
                      borderColor:
                        selectedCalculation === option.id
                          ? theme.accentBlue
                          : theme.borderColor,
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        selectedCalculation === option.id
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

      {/* Selection Panel */}
      <Modal
        visible={showSelectionPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelectionPanel(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setShowSelectionPanel(false)}>
          <View style={[styles.panel, {backgroundColor: theme.bgCard}]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, {color: theme.textPrimary}]}>
                Select Items
              </Text>
              <Pressable onPress={() => setShowSelectionPanel(false)}>
                <Icon name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.selectionList}>
              {availableItems.map((item, index) => (
                <Pressable
                  key={item}
                  onPress={() => handleItemToggle(item)}
                  style={[
                    styles.selectionItem,
                    {borderBottomColor: theme.borderColor},
                  ]}>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.selectionItemText,
                      {color: theme.textPrimary},
                    ]}
                    numberOfLines={1}>
                    {item}
                  </Text>
                  <Icon
                    name={
                      selectedItems.includes(item)
                        ? 'check-box'
                        : 'check-box-outline-blank'
                    }
                    size={22}
                    color={
                      selectedItems.includes(item)
                        ? theme.accentBlue
                        : theme.textMuted
                    }
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 80},
  pageTitle: {fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 12},
  totalCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
  },
  summaryRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  summaryCard: {flex: 1, borderRadius: 14, padding: 14},
  cardLabel: {color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500'},
  cardValue: {color: '#fff', fontSize: 22, fontWeight: '700', marginVertical: 4},
  cardValueSmall: {color: '#fff', fontSize: 18, fontWeight: '700', marginVertical: 4},
  cardFooter: {flexDirection: 'row', alignItems: 'center', gap: 4},
  cardFooterText: {color: 'rgba(255,255,255,0.7)', fontSize: 11},
  infoBanner: {fontSize: 13, textAlign: 'center', marginTop: 16, marginBottom: 12},
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  exportButtonText: {fontSize: 15, fontWeight: '600'},
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
  chipGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8},
  panelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectionList: {maxHeight: 300},
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  selectionItemText: {flex: 1, fontSize: 14},
  colorDot: {width: 12, height: 12, borderRadius: 6},
});

export default InsightsScreen;
