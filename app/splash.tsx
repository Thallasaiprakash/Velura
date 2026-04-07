import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Ellipse, Circle, Line } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'velura_onboarding_done';

export default function SplashScreen() {
  const router = useRouter();

  // Animations
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const raysOpacity = useSharedValue(0);
  const raysScale = useSharedValue(0.4);
  const textOpacity = useSharedValue(0);
  const textLetterSpacing = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo appears with spring
    logoScale.value = withSpring(1.0, { damping: 14, stiffness: 90 });
    logoOpacity.value = withTiming(1, { duration: 400 });

    // Rays extend after logo
    raysOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    raysScale.value = withDelay(400, withSpring(1.0, { damping: 12, stiffness: 100 }));

    // "VELURA" text
    textOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    textLetterSpacing.value = withDelay(700, withTiming(Theme.letterSpacing.widest, { duration: 700, easing: Easing.out(Easing.cubic) }));

    // Tagline
    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    // Navigate after 2.8s
    const timer = setTimeout(async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (done) {
        router.replace('/(tabs)/');
      } else {
        router.replace('/onboarding/step-name');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysOpacity.value,
    transform: [{ scale: raysScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    letterSpacing: textLetterSpacing.value,
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />

      {/* Eye Logo */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          {/* Eyelids */}
          <Ellipse cx="50" cy="50" rx="40" ry="22" fill="none" stroke={Colors.primary} strokeWidth="2.5" />
          {/* Iris */}
          <Circle cx="50" cy="50" r="16" fill="none" stroke={Colors.primary} strokeWidth="2" />
          {/* Pupil */}
          <Circle cx="50" cy="50" r="7" fill={Colors.primary} />
        </Svg>
      </Animated.View>

      {/* Rays */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.raysContainer, raysStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Cardinal rays */}
          <Line x1={width / 2} y1={height / 2 - 80} x2={width / 2} y2={height / 2 - 120} stroke={Colors.primary} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <Line x1={width / 2} y1={height / 2 + 80} x2={width / 2} y2={height / 2 + 120} stroke={Colors.primary} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <Line x1={width / 2 - 80} y1={height / 2} x2={width / 2 - 120} y2={height / 2} stroke={Colors.primary} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <Line x1={width / 2 + 80} y1={height / 2} x2={width / 2 + 120} y2={height / 2} stroke={Colors.primary} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          {/* Diagonal dots */}
          <Circle cx={width / 2 - 70} cy={height / 2 - 70} r="3" fill={Colors.primary} opacity="0.4" />
          <Circle cx={width / 2 + 70} cy={height / 2 - 70} r="3" fill={Colors.primary} opacity="0.4" />
          <Circle cx={width / 2 - 70} cy={height / 2 + 70} r="3" fill={Colors.primary} opacity="0.4" />
          <Circle cx={width / 2 + 70} cy={height / 2 + 70} r="3" fill={Colors.primary} opacity="0.4" />
        </Svg>
      </Animated.View>

      {/* Text */}
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.appName, textStyle]}>VELURA</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your day, spoken the moment you awaken your screen.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  raysContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.2,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 12,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
