import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';

import {Expense} from '../../../Types';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {selectExpense} from '../../../store/expenseActions';
import {createTimedAlert} from '../../../store/alertActions';
import {formatVendorName} from '../../../utility/utility';
import {useAppTheme} from '../../../styles/theme';

interface MergeExpensesProps {
  expenses: Expense[];
  visible: boolean;
  onClose: () => void;
  onMergeComplete?: (mergedExpense: Expense) => void;
}

const MergeExpensesModal: React.FC<MergeExpensesProps> = ({
  expenses,
  visible,
  onClose,
  onMergeComplete,
}) => {
  const theme = useAppTheme();
  const {tagList} = useSelector(selectExpense);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [totalCost, setTotalCost] = useState<number>(0);

  useEffect(() => {
    if (visible && expenses.length > 0) {
      const total = expenses.reduce((sum, exp) => {
        return sum + (exp.costType === 'debit' ? -exp.cost : exp.cost);
      }, 0);
      setTotalCost(total);
      setSelectedVendor('');
      setSelectedTag('');
    }
  }, [expenses, visible]);

  const onSaveMergedExpense = async () => {
    if (!selectedVendor) {
      createTimedAlert({type: 'error', message: 'Please select a vendor first'});
      return;
    }

    const vendorExpense =
      expenses.find(exp => exp.vendor === selectedVendor) || expenses[0];

    const mergedExpense: Expense = {
      id: vendorExpense.id,
      vendor: selectedVendor,
      tag: selectedTag || vendorExpense.tag,
      cost: Math.abs(totalCost),
      date: vendorExpense.date,
      modifiedDate: Date.now(),
      costType: totalCost < 0 ? 'debit' : 'credit',
      mailId: vendorExpense.mailId,
      user: vendorExpense.user,
      type: vendorExpense.type,
      operation: 'merged',
    };

    const promiseList = expenses.map(exp =>
      ExpenseAPI.addExpense(exp, 'delete'),
    );
    await Promise.all(promiseList);
    await ExpenseAPI.addExpense(mergedExpense);

    if (onMergeComplete) {
      onMergeComplete(mergedExpense);
    } else {
      onClose();
    }
  };

  const uniqueVendors = Array.from(
    new Set(expenses.map(exp => exp.vendor)),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.dialog, {backgroundColor: theme.bgCard}]}
          onPress={() => {}}>
          <Text style={[styles.title, {color: theme.textPrimary}]}>
            Merge {expenses.length} Expenses
          </Text>

          <Text
            style={[
              styles.totalCost,
              {color: totalCost < 0 ? theme.accentRed : theme.accentGreen},
            ]}>
            {totalCost < 0 ? '- ' : '+ '}₹{Math.abs(totalCost).toFixed(2)}
          </Text>

          {/* Vendor selection */}
          <Text style={[styles.sectionLabel, {color: theme.textMuted}]}>
            Select vendor for the merged expense:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}>
            {uniqueVendors.map((vendor, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedVendor(vendor)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedVendor === vendor
                        ? theme.accentBlue
                        : 'transparent',
                    borderColor:
                      selectedVendor === vendor
                        ? theme.accentBlue
                        : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color:
                        selectedVendor === vendor
                          ? theme.textWhite
                          : theme.textPrimary,
                    },
                  ]}
                  numberOfLines={1}>
                  {formatVendorName(vendor)[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Tag selection */}
          <Text style={[styles.categoryLabel, {color: theme.textPrimary}]}>
            Select a category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}>
            {tagList.map((tag, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedTag(tag)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedTag === tag
                        ? theme.accentBlue
                        : 'transparent',
                    borderColor:
                      selectedTag === tag
                        ? theme.accentBlue
                        : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color:
                        selectedTag === tag
                          ? theme.textWhite
                          : theme.textPrimary,
                    },
                  ]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onSaveMergedExpense}
              style={[
                styles.mergeButton,
                {backgroundColor: theme.accentBlue},
              ]}>
              <Text style={[styles.buttonText, {color: theme.textWhite}]}>
                Merge
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[
                styles.cancelButton,
                {borderColor: theme.borderColor},
              ]}>
              <Text
                style={[styles.buttonText, {color: theme.textPrimary}]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalCost: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipList: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 160,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  mergeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MergeExpensesModal;
