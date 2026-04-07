import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

interface VoiceWaveformProps {
  isActive: boolean;
}

const BAR_COUNT = 7;
const BAR_MIN_HEIGHT = 4;
const BAR_MAX_HEIGHT = 18;
const BAR_WIDTH = 3;
const BAR_GAP = 4;

function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  useEffect(() => {
    if (isActive) {
      const randomHeight = BAR_MIN_HEIGHT + Math.random() * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
      const duration = 100 + Math.random() * 150;
      height.value = withRepeat(
        withTiming(randomHeight, { duration }),
        -1,
        true
      );
    } else {
      height.value = withTiming(BAR_MIN_HEIGHT, { duration: 300 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animStyle,
        { width: BAR_WIDTH, marginHorizontal: BAR_GAP / 2 },
      ]}
    />
  );
}

export function VoiceWaveform({ isActive }: VoiceWaveformProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 8,
  },
  bar: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
