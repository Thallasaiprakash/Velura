import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    size: 2 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.3,
    delay: Math.random() * 3000,
    duration: 4000 + Math.random() * 3000,
  }));
}

interface ParticleItemProps {
  particle: Particle;
}

function ParticleItem({ particle }: ParticleItemProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT + 20);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-particle.size * 2, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animStyle,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          opacity: particle.opacity,
        },
      ]}
    />
  );
}

interface ParticleFieldProps {
  count?: number;
  color?: string;
}

const particles = generateParticles(12);

export function ParticleField({ count = 12, color = Colors.primary }: ParticleFieldProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.slice(0, count).map((p) => (
        <ParticleItem key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#a78bfa',
  },
});
