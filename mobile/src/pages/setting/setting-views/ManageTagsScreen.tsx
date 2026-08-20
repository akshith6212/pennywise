import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';

import {addTag, deleteTag, selectExpense, setTagList} from '../../../store/expenseActions';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {useAppTheme} from '../../../styles/theme';

const ManageTagsScreen: React.FC = () => {
  const theme = useAppTheme();
  const {tagList} = useSelector(selectExpense);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagToDelete, setTagToDelete] = useState('');

  useEffect(() => {
    ExpenseAPI.getTagList().then((tags: string[]) => {
      setTagList(tags);
    });
  }, []);

  const handleDeleteTag = (tag: string) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteTag(tagToDelete);
    void ExpenseAPI.updateTagList(tagList.filter(t => t !== tagToDelete));
    setDeleteDialogOpen(false);
  };

  const handleAddTag = () => {
    const trimmed = newTagName.trim();
    if (trimmed && !tagList.includes(trimmed)) {
      addTag(trimmed);
      void ExpenseAPI.updateTagList([...tagList, trimmed]);
      setAddDialogOpen(false);
      setNewTagName('');
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.hint, {color: theme.textMuted}]}>
          Add or remove tags. Tap the x on a pill to delete.
        </Text>

        <View style={styles.tagCloud}>
          {tagList.length === 0 ? (
            <Text style={[styles.emptyText, {color: theme.textMuted}]}>
              No tags yet — add one below.
            </Text>
          ) : (
            tagList.map(tag => (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  {borderColor: theme.accentBlue},
                ]}>
                <Text
                  style={[styles.tagChipText, {color: theme.accentBlue}]}>
                  {tag}
                </Text>
                <Pressable
                  onPress={() => handleDeleteTag(tag)}
                  hitSlop={8}>
                  <Icon
                    name="close"
                    size={16}
                    color={theme.accentBlue}
                  />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => setAddDialogOpen(true)}
          style={[styles.addButton, {backgroundColor: theme.accentBlue}]}>
          <Icon name="add" size={20} color={theme.textWhite} />
          <Text style={[styles.addButtonText, {color: theme.textWhite}]}>
            Add New Tag
          </Text>
        </Pressable>
      </ScrollView>

      {/* Add Tag Dialog */}
      <Modal
        visible={addDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddDialogOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setAddDialogOpen(false)}>
          <Pressable
            style={[styles.dialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.dialogTitle, {color: theme.textPrimary}]}>
              Add New Tag
            </Text>
            <Text style={[styles.dialogDesc, {color: theme.textSecondary}]}>
              Enter the name for your new tag.
            </Text>
            <View
              style={[
                styles.inputContainer,
                {borderColor: theme.borderColor, backgroundColor: theme.searchBg},
              ]}>
              <TextInput
                style={[styles.input, {color: theme.textPrimary}]}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Tag Name"
                placeholderTextColor={theme.searchPlaceholder}
                autoFocus
              />
            </View>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => {
                  setAddDialogOpen(false);
                  setNewTagName('');
                }}
                style={[styles.cancelBtn, {borderColor: theme.borderColor}]}>
                <Text style={[styles.btnText, {color: theme.textPrimary}]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddTag}
                disabled={!newTagName.trim()}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: newTagName.trim()
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
              Delete Tag
            </Text>
            <Text style={[styles.dialogDesc, {color: theme.textSecondary}]}>
              {`Are you sure you want to delete the tag "${tagToDelete}"?`}
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
                onPress={confirmDelete}
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
  scrollContent: {padding: 16},
  hint: {fontSize: 13, textAlign: 'center', marginBottom: 16},
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  emptyText: {fontSize: 14, textAlign: 'center', width: '100%'},
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagChipText: {fontSize: 13, fontWeight: '500'},
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addButtonText: {fontSize: 14, fontWeight: '600'},
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
  dialogDesc: {fontSize: 14, marginBottom: 16},
  inputContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
    marginBottom: 16,
  },
  input: {fontSize: 15, paddingVertical: 0},
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

export default ManageTagsScreen;
