import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  GroupByOption,
  groupByOptions,
  SortByOption,
  sortByOptions,
} from '../../dataValidations';
import {useAppTheme} from '../../../styles/theme';

interface GroupByPanelProps {
  visible: boolean;
  onClose: () => void;
  selectedGroupBy: GroupByOption;
  selectedSortBy: SortByOption;
  onGroupByChange: (option: GroupByOption) => void;
  onSortByChange: (option: SortByOption) => void;
}

const GroupByPanel: React.FC<GroupByPanelProps> = ({
  visible,
  onClose,
  selectedGroupBy,
  selectedSortBy,
  onGroupByChange,
  onSortByChange,
}) => {
  const theme = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.panel, {backgroundColor: theme.bgCard}]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, {color: theme.textPrimary}]}>
              Expense Options
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Group by section */}
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            Group by
          </Text>
          <View style={styles.chipRow}>
            {groupByOptions.map(option => (
              <Pressable
                key={option.id}
                onPress={() => onGroupByChange(option.id)}
                style={[
                  styles.chip,
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
                  style={[
                    styles.chipLabel,
                    {
                      color:
                        selectedGroupBy === option.id
                          ? theme.textWhite
                          : theme.textPrimary,
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Sort by section */}
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            Sort by
          </Text>
          <View style={styles.chipRow}>
            {sortByOptions.map(option => (
              <Pressable
                key={option.id}
                onPress={() => onSortByChange(option.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedSortBy === option.id
                        ? theme.accentBlue
                        : 'transparent',
                    borderColor:
                      selectedSortBy === option.id
                        ? theme.accentBlue
                        : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color:
                        selectedSortBy === option.id
                          ? theme.textWhite
                          : theme.textPrimary,
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default GroupByPanel;
