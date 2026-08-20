import {Platform, Vibration} from 'react-native';

export const hapticLight = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(10);
  }
};

export const hapticMedium = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(20);
  }
};

export const hapticHeavy = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(40);
  }
};

export const hapticSelection = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(5);
  }
};
