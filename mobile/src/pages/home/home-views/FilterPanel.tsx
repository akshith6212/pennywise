import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DateRange, filterOptions} from '../../dataValidations';
import {useAppTheme} from '../../../styles/theme';

interface FilterPanelProps {
  visible: boolean;
  onClose: () => void;
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  visible,
  onClose,
  selectedRange,
  onRangeChange,
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
              Filter by date range
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
          <View style={styles.chipGrid}>
            {filterOptions.map(option => (
              <Pressable
                key={option.id}
                onPress={() => onRangeChange(option.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedRange === option.id
                        ? theme.accentBlue
                        : 'transparent',
                    borderColor:
                      selectedRange === option.id
                        ? theme.accentBlue
                        : theme.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color:
                        selectedRange === option.id
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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

export default FilterPanel;
