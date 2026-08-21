import React, {useEffect, useRef} from 'react';
import {Animated, ViewStyle} from 'react-native';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  slideFrom?: 'top' | 'bottom' | 'left' | 'right';
  slideDistance?: number;
  style?: ViewStyle;
}

const AnimatedEntrance: React.FC<AnimatedEntranceProps> = ({
  children,
  delay = 0,
  duration = 300,
  slideFrom = 'bottom',
  slideDistance = 20,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isVertical = slideFrom === 'top' || slideFrom === 'bottom';
  const isNegative = slideFrom === 'top' || slideFrom === 'left';

  const animatedTranslate = isNegative
    ? Animated.multiply(translate, new Animated.Value(-1))
    : translate;

  const transformKey = isVertical ? 'translateY' : 'translateX';

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{[transformKey]: animatedTranslate}],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedEntrance;
