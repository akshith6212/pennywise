import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {
  hideTagExpense,
  selectExpense,
  setTagMap,
  updateExpense,
} from '../../../store/expenseActions';
import {createTimedAlert} from '../../../store/alertActions';
import {formatVendorName, getDateMonthTime, JSONCopy} from '../../../utility/utility';
import {useAppTheme} from '../../../styles/theme';

const TagExpenseModal: React.FC = () => {
  const theme = useAppTheme();
  const {vendorTagList, expense, isTagModal, tagList} =
    useSelector(selectExpense);

  const [selectedTag, setSelectedTag] = useState<string[]>([]);
  const [autoTag, setAutoTag] = useState<boolean>(false);

  if (expense == null || !isTagModal) {
    return null;
  }

  const copyToClipboard = (str: string) => {
    Clipboard.setString(str);
    createTimedAlert({message: 'Copied to clipboard', type: 'success'});
  };

  const onSaveExpense = () => {
    if (autoTag && selectedTag.length > 0) {
      const _vendor = expense.vendor;
      const _tag = expense.tag;

      let tagObj = vendorTagList.find(
        ({vendor, tag}) => vendor === _vendor && tag === _tag,
      );

      if (!tagObj) {
        tagObj = {
          id: _vendor,
          vendor: _vendor,
          tag: selectedTag[0],
          date: Date.now(),
        };
        void ExpenseAPI.updateVendorTag(tagObj);
        setTagMap(tagObj);
      }
    }

    const expenseNew = JSONCopy(expense);
    expenseNew.tag = selectedTag[0];
    void ExpenseAPI.addExpense(expenseNew);
    updateExpense(expenseNew);
    hideTagExpense();
  };

  const vendorNames = formatVendorName(expense.vendor);

  return (
    <Modal
      visible={isTagModal}
      transparent
      animationType="slide"
      onRequestClose={hideTagExpense}>
      <Pressable style={styles.overlay} onPress={hideTagExpense}>
        <Pressable
          style={[styles.dialog, {backgroundColor: theme.bgCard}]}
          onPress={() => {}}>
          {/* Vendor name */}
          <Text style={[styles.vendorName, {color: theme.textPrimary}]}>
            {vendorNames[0]}
          </Text>

          {/* UPI ID with copy button */}
          {vendorNames[1] && (
            <View style={styles.upiRow}>
              <Text style={[styles.upiId, {color: theme.textMuted}]}>
                {vendorNames[1]}
              </Text>
              <Pressable
                onPress={() => copyToClipboard(vendorNames[1])}
                style={styles.copyButton}>
                <Icon
                  name="content-copy"
                  size={16}
                  color={theme.textMuted}
                />
              </Pressable>
            </View>
          )}

          {/* Date */}
          <Text style={[styles.date, {color: theme.textMuted}]}>
            {getDateMonthTime(expense.date)}
          </Text>

          {/* Cost */}
          <Text style={[styles.cost, {color: theme.textPrimary}]}>
            ₹{expense.cost}
          </Text>

          {/* Current tag */}
          <Text
            style={[
              styles.currentTag,
              {color: expense.tag ? theme.accentRed : theme.accentPurple},
            ]}>
            {expense.tag ? expense.tag : 'untagged'}
          </Text>

          {/* Auto tag toggle */}
          <View
            style={[
              styles.autoTagContainer,
              {
                backgroundColor: autoTag
                  ? theme.accentBlueSubtle
                  : theme.bgSecondary,
                borderColor: autoTag ? theme.accentBlue : theme.borderColor,
              },
            ]}>
            <Text style={[styles.autoTagLabel, {color: theme.textPrimary}]}>
              Auto tag future transactions
            </Text>
            <Switch
              value={autoTag}
              onValueChange={setAutoTag}
              trackColor={{
                false: theme.borderColor,
                true: theme.accentBlue,
              }}
              thumbColor={theme.textWhite}
            />
          </View>

          {/* Tag selection */}
          <Text style={[styles.categoryLabel, {color: theme.textPrimary}]}>
            Select a category
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}>
            {tagList.map((val, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedTag([val])}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedTag.includes(val)
                      ? theme.accentBlue
                      : 'transparent',
                    borderColor: selectedTag.includes(val)
                      ? theme.accentBlue
                      : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: selectedTag.includes(val)
                        ? theme.textWhite
                        : theme.textPrimary,
                    },
                  ]}>
                  {val}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onSaveExpense}
              disabled={selectedTag.length === 0}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    selectedTag.length === 0
                      ? theme.textLight
                      : theme.accentBlue,
                },
              ]}>
              <Text style={[styles.buttonText, {color: theme.textWhite}]}>
                Save
              </Text>
            </Pressable>
            <Pressable
              onPress={hideTagExpense}
              style={[
                styles.closeButton,
                {borderColor: theme.borderColor},
              ]}>
              <Text
                style={[styles.buttonText, {color: theme.textPrimary}]}>
                Close
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
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  upiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  upiId: {
    fontSize: 13,
  },
  copyButton: {
    marginLeft: 6,
    padding: 4,
  },
  date: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  cost: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  currentTag: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  autoTagContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  autoTagLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  closeButton: {
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

export default TagExpenseModal;
