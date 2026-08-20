import React, {useEffect, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {BankEmailParsingEntry} from '../../../Types';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {createTimedAlert} from '../../../store/alertActions';
import {useAppTheme} from '../../../styles/theme';

function parseMatchStrings(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function newBankId(): string {
  return 'bank_' + Date.now();
}

const ManageBanksScreen: React.FC = () => {
  const theme = useAppTheme();
  const [banks, setBanks] = useState<BankEmailParsingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDeleteId, setBankToDeleteId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newMatchStringsRaw, setNewMatchStringsRaw] = useState('');

  useEffect(() => {
    ExpenseAPI.getEmailParseBankList().then(list => {
      setBanks(list);
      setLoading(false);
    });
  }, []);

  const handleDeleteBank = (id: string) => {
    setBankToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBank = async () => {
    const next = banks.filter(b => b.id !== bankToDeleteId);
    const ok = await ExpenseAPI.updateEmailParseBankList(next);
    setDeleteDialogOpen(false);
    if (ok) {
      setBanks(next);
      createTimedAlert({type: 'success', message: 'Bank deleted successfully.'});
    } else {
      createTimedAlert({type: 'error', message: 'Could not delete bank. Try again.'});
    }
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setNewDisplayName('');
    setNewMatchStringsRaw('');
  };

  const handleAddBank = async () => {
    const displayName = newDisplayName.trim();
    const matchStrings = parseMatchStrings(newMatchStringsRaw);
    if (!displayName || matchStrings.length === 0) return;

    const entry: BankEmailParsingEntry = {
      id: newBankId(),
      displayName,
      matchStrings,
    };

    const ok = await ExpenseAPI.updateEmailParseBankList([...banks, entry]);
    handleCloseAddDialog();
    if (ok) {
      setBanks(prev => [...prev, entry]);
      createTimedAlert({type: 'success', message: 'Bank added successfully.'});
    } else {
      createTimedAlert({type: 'error', message: 'Could not save bank. Try again.'});
    }
  };

  const canAdd =
    newDisplayName.trim().length > 0 &&
    parseMatchStrings(newMatchStringsRaw).length > 0;

  const renderItem = ({item}: {item: BankEmailParsingEntry}) => (
    <View style={[styles.listItem, {borderBottomColor: theme.borderColor}]}>
      <View style={styles.listItemContent}>
        <Text style={[styles.bankName, {color: theme.textPrimary}]}>
          {item.displayName}
        </Text>
        <Text
          style={[styles.matchStrings, {color: theme.textMuted}]}
          numberOfLines={2}>
          {item.matchStrings.join(', ')}
        </Text>
      </View>
      <Pressable
        onPress={() => handleDeleteBank(item.id)}
        hitSlop={8}
        style={styles.deleteBtn}>
        <Icon name="remove-circle-outline" size={22} color={theme.accentRed} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.bgPrimary}]} />
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <Text style={[styles.hint, {color: theme.textMuted}]}>
        Match phrases in bank emails (used by Gmail + Gemini parsing)
      </Text>

      <FlatList
        data={banks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            No banks configured yet.
          </Text>
        }
      />

      {/* Add FAB */}
      <Pressable
        onPress={() => setAddDialogOpen(true)}
        style={[styles.fab, {backgroundColor: theme.accentBlue}]}>
        <Icon name="add" size={28} color={theme.textWhite} />
      </Pressable>

      {/* Add Bank Dialog */}
      <Modal
        visible={addDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAddDialog}>
        <Pressable style={styles.overlay} onPress={handleCloseAddDialog}>
          <Pressable
            style={[styles.dialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.dialogTitle, {color: theme.textPrimary}]}>
              Add Bank
            </Text>
            <Text style={[styles.dialogDesc, {color: theme.textSecondary}]}>
              Display name is shown in logs. Add phrases that appear in alert
              emails (case-insensitive), one per line or comma-separated.
            </Text>

            <View
              style={[
                styles.inputContainer,
                {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
              ]}>
              <TextInput
                style={[styles.input, {color: theme.textPrimary}]}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="Bank display name"
                placeholderTextColor={theme.searchPlaceholder}
                autoFocus
              />
            </View>

            <View
              style={[
                styles.textAreaContainer,
                {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
              ]}>
              <TextInput
                style={[styles.textArea, {color: theme.textPrimary}]}
                value={newMatchStringsRaw}
                onChangeText={setNewMatchStringsRaw}
                placeholder={'e.g. hdfc\nhdfc bank'}
                placeholderTextColor={theme.searchPlaceholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseAddDialog}
                style={[styles.cancelBtn, {borderColor: theme.borderColor}]}>
                <Text style={[styles.btnText, {color: theme.textPrimary}]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddBank}
                disabled={!canAdd}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: canAdd
                      ? theme.accentBlue
                      : theme.textLight,
                  },
                ]}>
                <Text style={[styles.btnText, {color: theme.textWhite}]}>
                  Add
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Dialog */}
      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setDeleteDialogOpen(false)}>
          <Pressable
            style={[styles.dialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.dialogTitle, {color: theme.textPrimary}]}>
              Delete Bank
            </Text>
            <Text style={[styles.dialogDesc, {color: theme.textSecondary}]}>
              Remove this bank from email parsing configuration?
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setDeleteDialogOpen(false)}
                style={[styles.cancelBtn, {borderColor: theme.borderColor}]}>
                <Text style={[styles.btnText, {color: theme.textPrimary}]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteBank}
                style={[styles.saveBtn, {backgroundColor: theme.accentRed}]}>
                <Text style={[styles.btnText, {color: theme.textWhite}]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  hint: {fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingTop: 12},
  listContent: {padding: 16},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemContent: {flex: 1},
  bankName: {fontSize: 15, fontWeight: '500'},
  matchStrings: {fontSize: 12, marginTop: 2},
  deleteBtn: {paddingLeft: 12},
  emptyText: {fontSize: 14, textAlign: 'center', paddingTop: 40},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
  },
  dialogTitle: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  dialogDesc: {fontSize: 13, lineHeight: 18, marginBottom: 16},
  inputContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
  },
  input: {fontSize: 15, paddingVertical: 0},
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    minHeight: 100,
  },
  textArea: {fontSize: 15, paddingVertical: 0},
  dialogActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {fontSize: 14, fontWeight: '600'},
});

export default ManageBanksScreen;
