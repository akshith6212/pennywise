import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '../../styles/theme';

const SettingsScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <Text style={[styles.title, {color: theme.textPrimary}]}>Settings</Text>
      <Text style={[styles.subtitle, {color: theme.textMuted}]}>
        Settings screen — implemented in Epic 7
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default SettingsScreen;
