import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface LockScreenProps {
  onUnlock: () => Promise<boolean>;
}

const LockScreen: React.FC<LockScreenProps> = ({onUnlock}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name="lock" size={56} color="#ffffff" />
      </View>
      <Text style={styles.title}>Pennywise is Locked</Text>
      <Text style={styles.subtitle}>
        Verify your identity to continue
      </Text>
      <Pressable
        onPress={onUnlock}
        style={({pressed}) => [
          styles.unlockButton,
          pressed && {opacity: 0.8},
        ]}>
        <Icon name="fingerprint" size={24} color="#1c75bd" />
        <Text style={styles.unlockText}>Unlock</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181a1b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(28, 117, 189, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e0e0e0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9e9e9e',
    marginBottom: 40,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  unlockText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c75bd',
  },
});

export default LockScreen;
