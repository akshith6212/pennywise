import React, {useEffect, useState} from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';
import {v4 as uuidv4} from 'uuid';

import {Expense} from '../../../Types';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {selectExpense, updateExpense} from '../../../store/expenseActions';
import {createTimedAlert} from '../../../store/alertActions';
import {getDateMonthTime} from '../../../utility/utility';
import {useAppTheme} from '../../../styles/theme';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({visible, onClose}) => {
  const theme = useAppTheme();
  const {tagList} = useSelector(selectExpense);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [cost, setCost] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSelectedTag('');
      setCost('');
    }
  }, [visible]);

  const onSaveExpense = () => {
    Keyboard.dismiss();
    const id = uuidv4();
    const shortId = id.substring(0, 4);
    const newExpense: Expense = {
      id: 'manual',
      vendor: shortId + ' manual entry',
      date: Date.now(),
      modifiedDate: Date.now(),
      cost: parseFloat(cost),
      tag: selectedTag,
      costType: 'debit',
      mailId: id,
      user: 'manual',
      type: 'manual',
      operation: 'update',
    };

    ExpenseAPI.addExpense(newExpense).then(expense => {
      updateExpense(expense);
      createTimedAlert({message: 'Expense added', type: 'success'});
      onClose();
    });
  };

  const isDisabled =
    cost === '' || isNaN(parseFloat(cost)) || parseFloat(cost) <= 0;
  const formattedDateTime = getDateMonthTime(Date.now());

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
            Add New Expense
          </Text>
          <Text style={[styles.date, {color: theme.textMuted}]}>
            {formattedDateTime}
          </Text>

          <View
            style={[
              styles.costInputContainer,
              {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
            ]}>
            <Text style={[styles.currencyPrefix, {color: theme.textMuted}]}>
              ₹
            </Text>
            <TextInput
              style={[styles.costInput, {color: theme.textPrimary}]}
              value={cost}
              onChangeText={setCost}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.searchPlaceholder}
              autoFocus
            />
          </View>

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

          <View style={styles.actions}>
            <Pressable
              onPress={onSaveExpense}
              disabled={isDisabled}
              style={[
                styles.saveButton,
                {
                  backgroundColor: isDisabled
                    ? theme.textLight
                    : theme.accentBlue,
                },
              ]}>
              <Text style={[styles.buttonText, {color: theme.textWhite}]}>
                Save
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
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  costInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 0,
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
  saveButton: {
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

export default AddExpenseModal;
