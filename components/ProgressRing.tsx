import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  total: number;
  completed: number;
  size?: number;
}

export function ProgressRing({ total, completed, size = 120 }: ProgressRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;

  const strokeDashoffset = useSharedValue(circumference);

  useEffect(() => {
    const targetOffset = circumference * (1 - progress);
    strokeDashoffset.value = withTiming(targetOffset, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, circumference]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(167,139,250,0.12)"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={8}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {/* Center text */}
      <View style={styles.centerText}>
        <Text style={styles.countText}>{completed}/{total}</Text>
        <Text style={styles.doneText}>done</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  countText: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
  },
  doneText: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
  },
});
