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

import {Budget} from '../../Types';
import {ExpenseAPI} from '../../api/ExpenseAPI';
import {
  addBudget,
  deleteBudget,
  selectExpense,
  updateBudget,
} from '../../store/expenseActions';
import {createTimedAlert} from '../../store/alertActions';
import {useAppTheme} from '../../styles/theme';

interface EditBudgetModalProps {
  visible: boolean;
  budget: Budget | null;
  onClose: () => void;
  onBudgetUpdated?: (budget: Budget) => void;
  onBudgetDeleted?: (budgetId: string) => void;
}

const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  visible,
  budget,
  onClose,
  onBudgetUpdated,
  onBudgetDeleted,
}) => {
  const theme = useAppTheme();
  const {tagList} = useSelector(selectExpense);

  const [budgetName, setBudgetName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isAddMode = budget === null;

  useEffect(() => {
    if (visible && budget) {
      setBudgetName(budget.name);
      setAmount(budget.amount.toString());
      setSelectedTags([...budget.tagList]);
    }
  }, [visible, budget]);

  useEffect(() => {
    if (!visible) {
      setBudgetName('');
      setAmount('');
      setSelectedTags([]);
    }
  }, [visible]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const isFormValid = () => {
    return (
      budgetName.trim() !== '' &&
      !isNaN(parseFloat(amount)) &&
      parseFloat(amount) > 0 &&
      selectedTags.length > 0
    );
  };

  const onSaveBudget = async () => {
    Keyboard.dismiss();
    const budgetData = {
      name: budgetName.trim(),
      amount: parseFloat(amount),
      tagList: selectedTags,
      modifiedDate: Date.now(),
    };

    try {
      if (isAddMode) {
        const newBudget: Budget = {
          ...budgetData,
          id: '',
          operation: 'create',
        };
        const result = await ExpenseAPI.addBudget(newBudget);
        addBudget(result);
        createTimedAlert({
          type: 'success',
          message: 'Budget created successfully!',
        });
      } else {
        const updatedBudget: Budget = {
          ...budget,
          ...budgetData,
          operation: 'update',
        };
        const result = await ExpenseAPI.updateBudget(updatedBudget);
        updateBudget(result);
        createTimedAlert({
          type: 'success',
          message: 'Budget updated successfully!',
        });
      }
      if (onBudgetUpdated && budget) {
        onBudgetUpdated(budget);
      }
      onClose();
    } catch (error) {
      createTimedAlert({
        type: 'error',
        message: `Failed to ${isAddMode ? 'create' : 'update'} budget.`,
      });
      console.error('Error saving budget:', error);
    }
  };

  const onDeleteBudget = async () => {
    if (!budget) return;
    try {
      const success = await ExpenseAPI.deleteBudget(budget);
      if (success) {
        deleteBudget(budget.id);
        if (onBudgetDeleted) {
          onBudgetDeleted(budget.id);
        }
        createTimedAlert({
          type: 'success',
          message: 'Budget deleted successfully!',
        });
        onClose();
      } else {
        createTimedAlert({
          type: 'error',
          message: 'Failed to delete budget.',
        });
      }
    } catch (error) {
      createTimedAlert({
        type: 'error',
        message: 'Failed to delete budget.',
      });
      console.error('Error deleting budget:', error);
    }
  };

  const allTags = ['All', ...tagList];

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
            {isAddMode ? 'Add Budget' : 'Edit Budget'}
          </Text>

          {/* Budget Name */}
          <View
            style={[
              styles.inputContainer,
              {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
            ]}>
            <TextInput
              style={[styles.input, {color: theme.textPrimary}]}
              value={budgetName}
              onChangeText={setBudgetName}
              placeholder="Budget Name"
              placeholderTextColor={theme.searchPlaceholder}
              autoFocus={isAddMode}
            />
          </View>

          {/* Amount */}
          <View
            style={[
              styles.inputContainer,
              {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
            ]}>
            <Text style={[styles.currencyPrefix, {color: theme.textMuted}]}>
              ₹
            </Text>
            <TextInput
              style={[styles.input, {color: theme.textPrimary}]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={theme.searchPlaceholder}
            />
          </View>

          {/* Tag Selection */}
          <View style={[styles.tagHeader, {backgroundColor: theme.accentBlue}]}>
            <Text style={styles.tagHeaderText}>
              Select One or More Tags
            </Text>
          </View>

          <ScrollView
            style={styles.tagScrollView}
            contentContainerStyle={styles.tagGrid}
            showsVerticalScrollIndicator={false}>
            {allTags.map(tag => (
              <Pressable
                key={tag}
                onPress={() => handleTagToggle(tag)}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedTags.includes(tag)
                      ? theme.accentBlue
                      : 'transparent',
                    borderColor: selectedTags.includes(tag)
                      ? theme.accentBlue
                      : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.tagChipText,
                    {
                      color: selectedTags.includes(tag)
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
            {!isAddMode && (
              <Pressable
                onPress={onDeleteBudget}
                style={[
                  styles.deleteButton,
                  {backgroundColor: theme.accentRed},
                ]}>
                <Text
                  style={[styles.buttonText, {color: theme.textWhite}]}>
                  Delete
                </Text>
              </Pressable>
            )}
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
            <Pressable
              onPress={onSaveBudget}
              disabled={!isFormValid()}
              style={[
                styles.saveButton,
                {
                  backgroundColor: isFormValid()
                    ? theme.accentBlue
                    : theme.textLight,
                },
              ]}>
              <Text style={[styles.buttonText, {color: theme.textWhite}]}>
                {isAddMode ? 'Create' : 'Save'}
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
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  tagHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  tagHeaderText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  tagScrollView: {
    maxHeight: 150,
    marginBottom: 16,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditBudgetModal;
