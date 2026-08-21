import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useAppTheme} from '../styles/theme';

const Loading: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <ActivityIndicator size="large" color={theme.accentBlue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Loading;
