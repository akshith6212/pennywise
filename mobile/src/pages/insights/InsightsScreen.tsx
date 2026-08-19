import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '../../styles/theme';

const InsightsScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <Text style={[styles.title, {color: theme.textPrimary}]}>Insights</Text>
      <Text style={[styles.subtitle, {color: theme.textMuted}]}>
        Analytics screen — implemented in Epic 5
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

export default InsightsScreen;
