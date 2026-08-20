import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {VendorTag} from '../../../Types';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {createTimedAlert} from '../../../store/alertActions';
import {useAppTheme} from '../../../styles/theme';

const ManageVendorTagsScreen: React.FC = () => {
  const theme = useAppTheme();

  const [vendorTags, setVendorTags] = useState<VendorTag[]>([]);
  const [filteredVendorTags, setFilteredVendorTags] = useState<VendorTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVendorTag, setSelectedVendorTag] = useState<VendorTag | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [maps, tags] = await Promise.all([
        ExpenseAPI.getVendorTagList(),
        ExpenseAPI.getTagList(),
      ]);
      setVendorTags(maps);
      setFilteredVendorTags(maps);
      setAvailableTags(tags);
    } catch (err) {
      createTimedAlert({type: 'error', message: 'Failed to load vendor tags'});
      console.error('Error loading vendor tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterVendorTags = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredVendorTags(vendorTags);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredVendorTags(
      vendorTags.filter(
        vt =>
          vt.vendor.toLowerCase().includes(term) ||
          vt.tag.toLowerCase().includes(term),
      ),
    );
  }, [searchTerm, vendorTags]);

  useEffect(() => {
    filterVendorTags();
  }, [searchTerm, vendorTags, filterVendorTags]);

  const handleEditClick = (vt: VendorTag) => {
    setSelectedVendorTag(vt);
    setSelectedTag(vt.tag);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (vendorTagId: string) => {
    try {
      const result = await ExpenseAPI.deleteVendorTag(vendorTagId);
      if (result) {
        createTimedAlert({type: 'success', message: 'Vendor tag deleted'});
        setVendorTags(prev => prev.filter(vt => vt.id !== vendorTagId));
      } else {
        createTimedAlert({type: 'error', message: 'Failed to delete vendor tag'});
      }
    } catch (err) {
      createTimedAlert({type: 'error', message: 'Error deleting vendor tag'});
      console.error('Error deleting vendor tag:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedVendorTag) return;

    const updated: VendorTag = {
      ...selectedVendorTag,
      tag: selectedTag,
      date: Date.now(),
    };

    try {
      const result = await ExpenseAPI.updateVendorTag(updated);
      if (result) {
        createTimedAlert({type: 'success', message: 'Vendor tag updated'});
        setVendorTags(prev =>
          prev.map(vt => (vt.id === updated.id ? updated : vt)),
        );
      } else {
        createTimedAlert({type: 'error', message: 'Failed to update vendor tag'});
      }
    } catch (err) {
      createTimedAlert({type: 'error', message: 'Error updating vendor tag'});
      console.error('Error updating vendor tag:', err);
    } finally {
      setEditDialogOpen(false);
    }
  };

  const renderItem = ({item}: {item: VendorTag}) => (
    <Pressable
      onPress={() => handleEditClick(item)}
      style={[styles.listItem, {borderBottomColor: theme.borderColor}]}>
      <View style={styles.listItemContent}>
        <Text
          style={[styles.vendorName, {color: theme.textPrimary}]}
          numberOfLines={1}>
          {item.vendor.toLowerCase().substring(0, 25)}
        </Text>
        <Text style={[styles.tagLabel, {color: theme.textMuted}]}>
          Tag: {item.tag}
        </Text>
      </View>
      <Pressable
        onPress={() => handleDeleteClick(item.id)}
        hitSlop={8}
        style={styles.deleteBtn}>
        <Icon name="remove-circle-outline" size={22} color={theme.accentRed} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          {backgroundColor: theme.searchBg, borderColor: theme.searchBorder},
        ]}>
        <Icon name="search" size={20} color={theme.searchPlaceholder} />
        <TextInput
          style={[styles.searchInput, {color: theme.searchText}]}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by vendor or tag"
          placeholderTextColor={theme.searchPlaceholder}
        />
        {searchTerm.length > 0 && (
          <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
            <Icon name="close" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accentBlue} />
        </View>
      ) : filteredVendorTags.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            No vendor-tag mappings found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVendorTags}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Dialog */}
      <Modal
        visible={editDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditDialogOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setEditDialogOpen(false)}>
          <Pressable
            style={[styles.dialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.dialogTitle, {color: theme.textPrimary}]}>
              Edit Vendor Tag
            </Text>

            {selectedVendorTag && (
              <>
                <Text
                  style={[styles.vendorDisplay, {color: theme.textSecondary}]}>
                  {selectedVendorTag.vendor.toLowerCase()}
                </Text>

                <Text
                  style={[styles.categoryLabel, {color: theme.textSecondary}]}>
                  Select a category
                </Text>

                <View style={styles.tagGrid}>
                  {availableTags.map(tag => (
                    <Pressable
                      key={tag}
                      onPress={() => setSelectedTag(tag)}
                      style={[
                        styles.tagChip,
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
                          styles.tagChipText,
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
                </View>
              </>
            )}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setEditDialogOpen(false)}
                style={[styles.cancelBtn, {borderColor: theme.borderColor}]}>
                <Text style={[styles.btnText, {color: theme.textPrimary}]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={!selectedTag}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: selectedTag
                      ? theme.accentBlue
                      : theme.textLight,
                  },
                ]}>
                <Text style={[styles.btnText, {color: theme.textWhite}]}>
                  Save
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {flex: 1, fontSize: 14, paddingVertical: 0},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {fontSize: 14},
  listContent: {paddingHorizontal: 16},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemContent: {flex: 1},
  vendorName: {fontSize: 15, fontWeight: '500'},
  tagLabel: {fontSize: 12, marginTop: 2},
  deleteBtn: {paddingLeft: 12},
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
  dialogTitle: {fontSize: 18, fontWeight: '700', marginBottom: 12},
  vendorDisplay: {fontSize: 15, fontWeight: '500', marginBottom: 16},
  categoryLabel: {fontSize: 13, fontWeight: '600', marginBottom: 10},
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagChipText: {fontSize: 13, fontWeight: '500'},
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

export default ManageVendorTagsScreen;
