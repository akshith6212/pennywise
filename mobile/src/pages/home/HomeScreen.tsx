import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {Expense} from '../../Types';
import {
  deleteExpense,
  mergeSaveExpense,
  selectExpense,
  setExpenseList,
  setTagExpense,
} from '../../store/expenseActions';
import {formatVendorName, getDateMonth, sortByKey} from '../../utility/utility';
import {
  DateRange,
  filterExpensesByDate,
  filterOptions,
  GroupByOption,
  groupByOptions,
  GroupedExpenses,
  groupExpenses,
  searchExpenses,
  SortByOption,
  sortByOptions,
} from '../dataValidations';
import {ExpenseAPI} from '../../api/ExpenseAPI';
import {useAppTheme} from '../../styles/theme';
import {createTimedAlert} from '../../store/alertActions';

import AddExpenseModal from './home-views/AddExpense';
import MergeExpensesModal from './home-views/MergeExpenses';
import TagExpenseModal from './home-views/TagExpenses';
import FilterPanel from './home-views/FilterPanel';
import GroupByPanel from './home-views/GroupByPanel';

interface SectionData {
  title: string;
  groupKey: string;
  groupLabel: string;
  expenseCount: number;
  totalAmount: number;
  data: Expense[];
  isCollapsed: boolean;
}

const ExpenseItem = React.memo<{
  expense: Expense;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: (expense: Expense) => void;
  onView: (expense: Expense) => void;
  onLongPress: (expense: Expense) => void;
}>(({expense, isSelected, selectionMode, onSelect, onView, onLongPress}) => {
  const theme = useAppTheme();
  const vendorNames = formatVendorName(expense.vendor);

  const handlePress = useCallback(() => {
    if (selectionMode) {
      onSelect(expense);
    } else {
      onView(expense);
    }
  }, [expense, selectionMode, onSelect, onView]);

  const handleLongPress = useCallback(() => {
    onLongPress(expense);
  }, [expense, onLongPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[
        styles.expenseRow,
        {
          backgroundColor: isSelected
            ? theme.accentBlueSubtle
            : theme.bgCard,
          borderBottomColor: theme.borderColor,
        },
      ]}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isSelected
              ? theme.accentBlue
              : theme.bgTertiary,
          },
        ]}>
        {isSelected ? (
          <Icon name="check-circle" size={20} color={theme.textWhite} />
        ) : expense.type === 'credit-card' ? (
          <Icon name="credit-card" size={20} color={theme.textMuted} />
        ) : (
          <Icon name="currency-rupee" size={20} color={theme.textMuted} />
        )}
      </View>

      <View style={styles.expenseContent}>
        <View style={styles.expenseTopRow}>
          <Text
            style={[styles.vendorName, {color: theme.textPrimary}]}
            numberOfLines={1}>
            {vendorNames[0]}
          </Text>
          <View style={styles.costContainer}>
            <Text style={[styles.costType, {color: theme.textMuted}]}>
              {expense.costType === 'debit' ? '' : '+'}
            </Text>
            <Text style={[styles.currency, {color: theme.textMuted}]}>₹</Text>
            <Text style={[styles.cost, {color: theme.textPrimary}]}>
              {expense.cost}
            </Text>
          </View>
        </View>
        <Text style={[styles.dateText, {color: theme.textMuted}]}>
          {getDateMonth(expense.date)}
        </Text>
        <Text
          style={[
            styles.tagText,
            {
              color: expense.tag ? theme.accentRed : theme.accentPurple,
            },
          ]}>
          {expense.tag ? expense.tag : 'untagged'}
        </Text>
      </View>
    </Pressable>
  );
});

const HomeScreen: React.FC = () => {
  const theme = useAppTheme();
  const {expenseList, isAppLoading} = useSelector(selectExpense);
  const sectionListRef = useRef<SectionList>(null);

  const [selectedRange, setSelectedRange] = useState<DateRange>('7d');
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilteredExpenses, setDateFilteredExpenses] = useState<Expense[]>(
    [],
  );
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
  const [collapsedGroups, setCollapsedGroups] = useState<{
    [groupKey: string]: boolean;
  }>({});
  const [selectedGroupBy, setSelectedGroupBy] =
    useState<GroupByOption>('days');
  const [selectedSortBy, setSelectedSortBy] = useState<SortByOption>(null);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Expense[]>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupByPanel, setShowGroupByPanel] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLoading(isAppLoading);
  }, [isAppLoading]);

  const reloadExpenseList = useCallback(() => {
    setIsRefreshing(true);
    ExpenseAPI.getExpenseList()
      .then(expenses => {
        const sortedExpenses = sortByKey(expenses, 'date');
        setExpenseList(sortedExpenses);
        setTimeout(() => setIsRefreshing(false), 300);
      })
      .catch(error => {
        console.error('Error reloading expenses:', error);
        setIsRefreshing(false);
      });
  }, []);

  // Filter expenses based on selected date range
  useEffect(() => {
    if (expenseList.length === 0) {
      setDateFilteredExpenses([]);
      return;
    }
    const filtered = filterExpensesByDate(expenseList, selectedRange);
    const sortedExpenses = sortByKey(filtered, 'date');
    setDateFilteredExpenses(sortedExpenses);
  }, [expenseList, selectedRange]);

  // Apply search filter after date filtering
  useEffect(() => {
    const searchResults = searchExpenses(dateFilteredExpenses, searchTerm);
    setFilteredExpenses(searchResults);
  }, [dateFilteredExpenses, searchTerm]);

  // Group expenses based on selected grouping option
  useEffect(() => {
    if (filteredExpenses.length === 0) {
      setGroupedExpenses({});
      return;
    }
    const grouped = groupExpenses(filteredExpenses, selectedGroupBy);
    const newCollapsed: {[key: string]: boolean} = {};
    Object.keys(grouped).forEach(groupKey => {
      newCollapsed[groupKey] = selectedGroupBy !== 'days';
    });
    setCollapsedGroups(newCollapsed);
    setGroupedExpenses(grouped);
    setLoading(false);
  }, [filteredExpenses, selectedGroupBy, selectedSortBy]);

  // Exit selection mode when search term changes
  useEffect(() => {
    if (searchTerm && selectionMode) {
      cancelSelection();
    }
  }, [searchTerm]);

  // Update allCollapsed state when grouped expenses change
  useEffect(() => {
    if (Object.keys(groupedExpenses).length === 0) {
      setAllCollapsed(false);
      return;
    }
    const areAllCollapsed = Object.keys(groupedExpenses).every(
      key => collapsedGroups[key],
    );
    setAllCollapsed(areAllCollapsed);
  }, [groupedExpenses, collapsedGroups]);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  const toggleAllGroupsCollapse = useCallback(() => {
    setAllCollapsed(prev => {
      const newState = !prev;
      const updated: {[key: string]: boolean} = {};
      Object.keys(groupedExpenses).forEach(key => {
        updated[key] = newState;
      });
      setCollapsedGroups(updated);
      return newState;
    });
  }, [groupedExpenses]);

  const toggleExpenseSelection = useCallback(
    (expense: Expense) => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedExpenses([expense]);
        setShowFilterPanel(false);
        setShowGroupByPanel(false);
      } else {
        const isSelected = selectedExpenses.some(e => e.id === expense.id);
        if (isSelected) {
          const newSelected = selectedExpenses.filter(
            e => e.id !== expense.id,
          );
          setSelectedExpenses(newSelected);
          if (newSelected.length === 0) {
            setSelectionMode(false);
          }
        } else {
          setSelectedExpenses([...selectedExpenses, expense]);
        }
      }
    },
    [selectionMode, selectedExpenses],
  );

  const handleLongPress = useCallback(
    (expense: Expense) => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedExpenses([expense]);
        setShowFilterPanel(false);
        setShowGroupByPanel(false);
      } else {
        toggleExpenseSelection(expense);
      }
    },
    [selectionMode, toggleExpenseSelection],
  );

  const cancelSelection = useCallback(() => {
    setSelectedExpenses([]);
    setSelectionMode(false);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedExpenses.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const deletePromises = selectedExpenses.map(expense =>
        ExpenseAPI.addExpense(expense, 'delete'),
      );
      await Promise.all(deletePromises);
      selectedExpenses.forEach(expense => deleteExpense(expense));
    } catch (error) {
      console.error('Error deleting expenses:', error);
    } finally {
      cancelSelection();
      setTimeout(reloadExpenseList, 500);
    }
  }, [selectedExpenses, cancelSelection, reloadExpenseList]);

  const handleMergeSelected = useCallback(() => {
    if (selectedExpenses.length < 2) {
      return;
    }
    setShowMergeDialog(true);
  }, [selectedExpenses]);

  const handleMergeComplete = useCallback(
    (mergedExpense: Expense) => {
      setShowMergeDialog(false);
      mergeSaveExpense(selectedExpenses, mergedExpense);
      cancelSelection();
    },
    [selectedExpenses, cancelSelection],
  );

  const onSetExpense = useCallback((expense: Expense) => {
    setTagExpense(expense);
  }, []);

  const handleRangeChange = useCallback((range: DateRange) => {
    setSelectedRange(range);
    setShowFilterPanel(false);
  }, []);

  const handleGroupByChange = useCallback((option: GroupByOption) => {
    if (option === 'days') {
      setSelectedGroupBy(option);
      setSelectedSortBy('date');
    } else {
      setSelectedGroupBy(option);
      setSelectedSortBy('count');
    }
    setShowGroupByPanel(false);
  }, []);

  const handleSortByChange = useCallback(
    (option: SortByOption) => {
      if (option !== selectedSortBy) {
        setSelectedSortBy(option);
        setShowGroupByPanel(false);
      } else {
        setSelectedSortBy(null);
      }
    },
    [selectedSortBy],
  );

  const scrollToTop = useCallback(() => {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      animated: true,
    });
  }, []);

  const handleScroll = useCallback(
    (event: {nativeEvent: {contentOffset: {y: number}}}) => {
      setShowScrollTop(event.nativeEvent.contentOffset.y > 300);
    },
    [],
  );

  const sections: SectionData[] = useMemo(() => {
    return Object.entries(groupedExpenses)
      .sort(([keyA, groupDataA], [keyB, groupDataB]) => {
        if (
          selectedGroupBy === 'days' &&
          (selectedSortBy === 'date' || selectedSortBy == null)
        ) {
          return keyB.localeCompare(keyA);
        }
        return selectedSortBy === 'cost'
          ? groupDataB.totalAmount - groupDataA.totalAmount
          : groupDataB.expenses.length - groupDataA.expenses.length;
      })
      .map(([groupKey, groupData]) => ({
        title: groupKey,
        groupKey,
        groupLabel: groupData.groupLabel,
        expenseCount: groupData.expenses.length,
        totalAmount: groupData.totalAmount,
        data: collapsedGroups[groupKey] ? [] : groupData.expenses,
        isCollapsed: collapsedGroups[groupKey] || false,
      }));
  }, [
    groupedExpenses,
    collapsedGroups,
    selectedGroupBy,
    selectedSortBy,
  ]);

  const renderSectionHeader = useCallback(
    ({section}: {section: SectionListData<Expense, SectionData>}) => {
      const s = section as SectionData;
      return (
        <Pressable
          onPress={() => toggleGroupCollapse(s.groupKey)}
          style={[
            styles.sectionHeader,
            {backgroundColor: theme.groupHeaderBg},
          ]}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={[styles.groupLabel, {color: theme.groupLabel}]}>
              {selectedGroupBy === 'days'
                ? s.groupLabel
                : s.groupLabel.toLowerCase()}
            </Text>
            <Text style={[styles.groupCount, {color: theme.groupCount}]}>
              {s.expenseCount} expense{s.expenseCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.sectionHeaderRight}>
            <Text style={[styles.totalAmount, {color: theme.textPrimary}]}>
              ₹{s.totalAmount.toFixed(0)}
            </Text>
            <Icon
              name={s.isCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
              size={24}
              color={theme.textMuted}
            />
          </View>
        </Pressable>
      );
    },
    [theme, selectedGroupBy, toggleGroupCollapse],
  );

  const renderItem = useCallback(
    ({item}: {item: Expense}) => {
      const isSelected = selectedExpenses.some(e => e.id === item.id);
      return (
        <ExpenseItem
          expense={item}
          isSelected={isSelected}
          selectionMode={selectionMode}
          onSelect={toggleExpenseSelection}
          onView={onSetExpense}
          onLongPress={handleLongPress}
        />
      );
    },
    [
      selectedExpenses,
      selectionMode,
      toggleExpenseSelection,
      onSetExpense,
      handleLongPress,
    ],
  );

  const keyExtractor = useCallback(
    (item: Expense, index: number) => item.mailId || `${item.id}-${index}`,
    [],
  );

  if (isLoading && expenseList.length === 0) {
    return (
      <View
        style={[styles.loadingContainer, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, {backgroundColor: theme.bgPrimary}]}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.searchBg,
              borderColor: theme.searchBorder,
            },
          ]}>
          <Icon name="search" size={20} color={theme.searchPlaceholder} />
          <TextInput
            style={[styles.searchInput, {color: theme.searchText}]}
            placeholder="Search expenses..."
            placeholderTextColor={theme.searchPlaceholder}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => setSearchTerm('')}>
              <Icon name="close" size={20} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Expense List */}
      {filteredExpenses.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Icon name="receipt-long" size={48} color={theme.textLight} />
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            {searchTerm
              ? 'No matching expenses found'
              : 'No expenses found for selected period'}
          </Text>
        </View>
      ) : (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={reloadExpenseList}
              colors={[theme.accentBlue]}
              tintColor={theme.accentBlue}
              progressBackgroundColor={theme.bgCard}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bottom buttons bar */}
      <View style={[styles.bottomBar, {backgroundColor: theme.bgCard, borderTopColor: theme.borderColor}]}>
        {!selectionMode ? (
          <>
            {/* Filter button */}
            <Pressable
              onPress={() => {
                setShowFilterPanel(!showFilterPanel);
                setShowGroupByPanel(false);
              }}
              style={[
                styles.chipButton,
                {backgroundColor: theme.accentBlue},
              ]}>
              <Icon name="filter-list" size={16} color={theme.textWhite} />
              <Text style={[styles.chipText, {color: theme.textWhite}]}>
                {filterOptions.find(o => o.id === selectedRange)?.label}
              </Text>
            </Pressable>

            {/* Add Expense FAB */}
            <Pressable
              onPress={() => setShowAddExpenseDialog(true)}
              style={[styles.fab, {backgroundColor: theme.accentGreen}]}>
              <Icon name="add" size={28} color={theme.textWhite} />
            </Pressable>

            {/* Group by button */}
            <Pressable
              onPress={() => {
                setShowGroupByPanel(!showGroupByPanel);
                setShowFilterPanel(false);
              }}
              style={[
                styles.chipButton,
                {backgroundColor: theme.accentBlue},
              ]}>
              <Icon name="sort" size={16} color={theme.textWhite} />
              <Text style={[styles.chipText, {color: theme.textWhite}]}>
                {groupByOptions.find(o => o.id === selectedGroupBy)?.label}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Selected count */}
            <Text style={[styles.selectedCount, {color: theme.textPrimary}]}>
              {selectedExpenses.length}{' '}
              {selectedExpenses.length === 1 ? 'expense' : 'expenses'}
            </Text>

            {/* Cancel */}
            <Pressable
              onPress={cancelSelection}
              style={[
                styles.actionChip,
                {backgroundColor: theme.accentYellow},
              ]}>
              <Icon name="close" size={16} color="#333" />
              <Text style={[styles.actionChipText, {color: '#333'}]}>
                Clear
              </Text>
            </Pressable>

            {/* Delete */}
            <Pressable
              onPress={handleDeleteSelected}
              style={[
                styles.actionChip,
                {backgroundColor: theme.accentRed},
              ]}>
              <Icon name="delete" size={16} color={theme.textWhite} />
              <Text
                style={[styles.actionChipText, {color: theme.textWhite}]}>
                Delete
              </Text>
            </Pressable>

            {/* Merge */}
            <Pressable
              onPress={handleMergeSelected}
              disabled={selectedExpenses.length < 2}
              style={[
                styles.actionChip,
                {
                  backgroundColor:
                    selectedExpenses.length < 2
                      ? theme.textLight
                      : theme.accentBlue,
                },
              ]}>
              <Icon name="merge" size={16} color={theme.textWhite} />
              <Text
                style={[styles.actionChipText, {color: theme.textWhite}]}>
                Merge
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Scroll to top button */}
      {showScrollTop && !selectionMode && (
        <Pressable
          onPress={scrollToTop}
          style={[styles.scrollTopButton, {backgroundColor: theme.accentBlue}]}>
          <Icon name="keyboard-arrow-up" size={24} color={theme.textWhite} />
        </Pressable>
      )}

      {/* Collapse all button */}
      {filteredExpenses.length > 0 && !selectionMode && (
        <Pressable
          onPress={toggleAllGroupsCollapse}
          style={[
            styles.collapseAllButton,
            {backgroundColor: theme.accentBlue},
          ]}>
          <Icon
            name={allCollapsed ? 'unfold-more' : 'unfold-less'}
            size={24}
            color={theme.textWhite}
          />
        </Pressable>
      )}

      {/* Filter Panel */}
      <FilterPanel
        visible={showFilterPanel && !selectionMode}
        onClose={() => setShowFilterPanel(false)}
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
      />

      {/* Group By Panel */}
      <GroupByPanel
        visible={showGroupByPanel && !selectionMode}
        onClose={() => setShowGroupByPanel(false)}
        selectedGroupBy={selectedGroupBy}
        selectedSortBy={selectedSortBy}
        onGroupByChange={handleGroupByChange}
        onSortByChange={handleSortByChange}
      />

      {/* Tag Expense Modal (global) */}
      <TagExpenseModal />

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showAddExpenseDialog}
        onClose={() => setShowAddExpenseDialog(false)}
      />

      {/* Merge Expenses Modal */}
      <MergeExpensesModal
        visible={showMergeDialog}
        onClose={() => setShowMergeDialog(false)}
        expenses={selectedExpenses}
        onMergeComplete={handleMergeComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupCount: {
    fontSize: 12,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseContent: {
    flex: 1,
  },
  expenseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costType: {
    fontSize: 13,
  },
  currency: {
    fontSize: 12,
    marginRight: 1,
  },
  cost: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
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
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  selectedCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollTopButton: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  collapseAllButton: {
    position: 'absolute',
    right: 16,
    bottom: 190,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default HomeScreen;
