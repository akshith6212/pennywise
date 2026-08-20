import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {BankConfig} from '../../../Types';
import {ExpenseAPI} from '../../../api/ExpenseAPI';
import {useAppTheme} from '../../../styles/theme';

const ConfigurationScreen: React.FC = () => {
  const theme = useAppTheme();

  const [bankConfig, setBankConfig] = useState<BankConfig>({
    enableUpi: false,
    creditCards: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [newCardDigits, setNewCardDigits] = useState('');
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const config = await ExpenseAPI.getBankConfig();
        setBankConfig(config);
      } catch (error) {
        console.error('Error fetching bank configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchConfig();
  }, []);

  const handleUpiToggle = async () => {
    setIsSaving(true);
    const updated = {...bankConfig, enableUpi: !bankConfig.enableUpi};
    try {
      const success = await ExpenseAPI.updateBankConfig(updated);
      if (success) {
        setBankConfig(updated);
      }
    } catch (error) {
      console.error('Error updating UPI setting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCard = () => {
    setCardDialogOpen(true);
    setNewCardDigits('');
    setCardError('');
  };

  const handleSaveCard = async () => {
    if (!newCardDigits) {
      setCardError('Please enter the last 4 digits');
      return;
    }
    if (!/^\d{4}$/.test(newCardDigits)) {
      setCardError('Please enter exactly 4 digits');
      return;
    }
    if (bankConfig.creditCards.includes(newCardDigits)) {
      setCardError('This card has already been added');
      return;
    }

    setIsSaving(true);
    const updated = {
      ...bankConfig,
      creditCards: [...bankConfig.creditCards, newCardDigits],
    };
    try {
      const success = await ExpenseAPI.updateBankConfig(updated);
      if (success) {
        setBankConfig(updated);
        setCardDialogOpen(false);
      } else {
        setCardError('Failed to add credit card');
      }
    } catch (error) {
      console.error('Error adding credit card:', error);
      setCardError('Error saving credit card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCard = async (cardDigits: string) => {
    setIsSaving(true);
    const updated = {
      ...bankConfig,
      creditCards: bankConfig.creditCards.filter(c => c !== cardDigits),
    };
    try {
      const success = await ExpenseAPI.updateBankConfig(updated);
      if (success) {
        setBankConfig(updated);
      }
    } catch (error) {
      console.error('Error removing credit card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: theme.bgPrimary}]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bank Account Settings */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
            Bank Account Settings
          </Text>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, {color: theme.textPrimary}]}>
              Enable HDFC UPI
            </Text>
            <Switch
              value={bankConfig.enableUpi}
              onValueChange={handleUpiToggle}
              disabled={isSaving}
              trackColor={{false: '#ccc', true: theme.accentBlue}}
              thumbColor={theme.textWhite}
            />
          </View>
          {isSaving && (
            <ActivityIndicator
              size="small"
              color={theme.accentBlue}
              style={styles.savingIndicator}
            />
          )}
        </View>

        {/* Credit Cards */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.bgCard, borderColor: theme.borderColor},
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: theme.textPrimary}]}>
              Credit Cards
            </Text>
            <Pressable
              onPress={handleAddCard}
              disabled={isSaving}
              style={[styles.addCardBtn, {backgroundColor: theme.accentBlue}]}>
              <Icon name="add" size={16} color={theme.textWhite} />
              <Text style={[styles.addCardText, {color: theme.textWhite}]}>
                Add Card
              </Text>
            </Pressable>
          </View>

          <View
            style={[styles.divider, {backgroundColor: theme.borderColor}]}
          />

          {bankConfig.creditCards.length === 0 ? (
            <Text style={[styles.emptyText, {color: theme.textMuted}]}>
              No credit cards added yet
            </Text>
          ) : (
            bankConfig.creditCards.map((digits, index) => (
              <View
                key={index}
                style={[styles.cardItem, {borderBottomColor: theme.borderColor}]}>
                <Icon
                  name="credit-card"
                  size={20}
                  color={theme.textSecondary}
                />
                <Text style={[styles.cardText, {color: theme.textPrimary}]}>
                  HDFC ****{digits}
                </Text>
                <Pressable
                  onPress={() => handleRemoveCard(digits)}
                  disabled={isSaving}
                  hitSlop={8}>
                  <Icon
                    name="remove-circle-outline"
                    size={20}
                    color={theme.accentRed}
                  />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Credit Card Dialog */}
      <Modal
        visible={cardDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCardDialogOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setCardDialogOpen(false)}>
          <Pressable
            style={[styles.dialog, {backgroundColor: theme.bgCard}]}
            onPress={() => {}}>
            <Text style={[styles.dialogTitle, {color: theme.textPrimary}]}>
              Add New Credit Card
            </Text>
            <Text style={[styles.dialogDesc, {color: theme.textSecondary}]}>
              Please enter the last 4 digits of your HDFC credit card.
            </Text>

            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: cardError
                    ? theme.accentRed
                    : theme.borderColor,
                  backgroundColor: theme.searchBg,
                },
              ]}>
              <TextInput
                style={[styles.input, {color: theme.textPrimary}]}
                value={newCardDigits}
                onChangeText={text => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 4);
                  setNewCardDigits(cleaned);
                  setCardError('');
                }}
                placeholder="Last 4 Digits"
                placeholderTextColor={theme.searchPlaceholder}
                keyboardType="numeric"
                maxLength={4}
                autoFocus
              />
            </View>
            {cardError ? (
              <Text style={[styles.errorText, {color: theme.accentRed}]}>
                {cardError}
              </Text>
            ) : null}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setCardDialogOpen(false)}
                style={[styles.cancelBtn, {borderColor: theme.borderColor}]}>
                <Text style={[styles.btnText, {color: theme.textPrimary}]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveCard}
                style={[styles.saveBtn, {backgroundColor: theme.accentBlue}]}>
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
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scrollContent: {padding: 16, gap: 16, paddingBottom: 32},
  section: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {fontSize: 16, fontWeight: '600'},
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleLabel: {fontSize: 15},
  savingIndicator: {marginTop: 8},
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addCardText: {fontSize: 12, fontWeight: '600'},
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 12},
  emptyText: {fontSize: 14, textAlign: 'center', paddingVertical: 12},
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardText: {flex: 1, fontSize: 15, fontWeight: '500'},
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
    marginBottom: 4,
  },
  input: {fontSize: 15, paddingVertical: 0},
  errorText: {fontSize: 12, marginBottom: 12, marginTop: 4},
  dialogActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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

export default ConfigurationScreen;
