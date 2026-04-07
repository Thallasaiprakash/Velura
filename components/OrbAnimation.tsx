import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Ellipse, Circle, Line } from 'react-native-svg';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.55;

interface OrbAnimationProps {
  size?: number;
}

export function OrbAnimation({ size = ORB_SIZE }: OrbAnimationProps) {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    // Outer ring: slowest pulse
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // Middle ring: medium
    scale2.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // Inner: fastest
    scale3.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.98, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));
  const middleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const outerSize = size;
  const middleSize = size * 0.75;
  const innerSize = size * 0.5;
  const eyeSize = size * 0.32;

  return (
    <View style={[styles.container, { width: outerSize, height: outerSize }]}>
      {/* Glow background */}
      <Animated.View
        style={[
          styles.glow,
          { width: outerSize * 1.2, height: outerSize * 1.2, borderRadius: outerSize * 0.6 },
          glowStyle,
        ]}
      />

      {/* Outer ring */}
      <Animated.View
        style={[
          styles.ring,
          outerStyle,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderColor: 'rgba(167,139,250,0.18)',
          },
        ]}
      />

      {/* Middle ring */}
      <Animated.View
        style={[
          styles.ring,
          middleStyle,
          {
            width: middleSize,
            height: middleSize,
            borderRadius: middleSize / 2,
            borderColor: 'rgba(167,139,250,0.35)',
          },
        ]}
      />

      {/* Inner filled circle */}
      <Animated.View
        style={[
          styles.innerCircle,
          innerStyle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      />

      {/* Eye SVG logo */}
      <View style={[styles.eyeContainer, { width: eyeSize, height: eyeSize }]}>
        <Svg width={eyeSize} height={eyeSize} viewBox="0 0 100 100">
          {/* Eyelids */}
          <Ellipse
            cx="50" cy="50" rx="40" ry="22"
            fill="none" stroke="white" strokeWidth="3"
          />
          {/* Iris */}
          <Circle cx="50" cy="50" r="16" fill="none" stroke="white" strokeWidth="2.5" />
          {/* Pupil */}
          <Circle cx="50" cy="50" r="7" fill="white" />
          {/* Cardinal rays */}
          <Line x1="50" y1="5" x2="50" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <Line x1="50" y1="78" x2="50" y2="95" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <Line x1="5" y1="50" x2="22" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <Line x1="78" y1="50" x2="95" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
          {/* Diagonal dots */}
          <Circle cx="26" cy="26" r="3" fill="white" opacity="0.7" />
          <Circle cx="74" cy="26" r="3" fill="white" opacity="0.7" />
          <Circle cx="26" cy="74" r="3" fill="white" opacity="0.7" />
          <Circle cx="74" cy="74" r="3" fill="white" opacity="0.7" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(167,139,250,0.08)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  innerCircle: {
    position: 'absolute',
    backgroundColor: Colors.primary,
  },
  eyeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
