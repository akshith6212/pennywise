import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSelector} from 'react-redux';

import {RootState} from '../store/store';
import {Alert as AlertType} from '../Types';
import {removeAlert} from '../store/alertActions';
import {useAppTheme} from '../styles/theme';

const getAlertIcon = (type: AlertType['type']): string => {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

const AlertItem: React.FC<{alert: AlertType; index: number}> = ({
  alert,
  index,
}) => {
  const theme = useAppTheme();
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getColors = () => {
    switch (alert.type) {
      case 'success':
        return {bg: theme.accentGreenSubtle, border: theme.accentGreen, icon: theme.accentGreen};
      case 'error':
        return {bg: theme.accentRedSubtle, border: theme.accentRed, icon: theme.accentRed};
      case 'warning':
        return {bg: theme.accentYellowSubtle, border: theme.accentYellow, icon: theme.accentYellow};
      case 'info':
      default:
        return {bg: theme.accentBlueSubtle, border: theme.accentBlue, icon: theme.accentBlue};
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.alertItem,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{translateY}],
          opacity,
          top: index * 4,
        },
      ]}>
      <Icon name={getAlertIcon(alert.type)} size={20} color={colors.icon} />
      <Text
        style={[styles.alertMessage, {color: theme.textPrimary}]}
        numberOfLines={2}>
        {alert.message}
      </Text>
      <Pressable onPress={() => removeAlert(alert.id)} hitSlop={8}>
        <Icon name="close" size={18} color={theme.textMuted} />
      </Pressable>
    </Animated.View>
  );
};

const AlertComponent: React.FC = () => {
  const alerts = useSelector((state: RootState) => state.expense.alerts);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {alerts.map((alert, index) => (
        <AlertItem key={alert.id} alert={alert} index={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  alertMessage: {flex: 1, fontSize: 13, fontWeight: '500'},
});

export default AlertComponent;
