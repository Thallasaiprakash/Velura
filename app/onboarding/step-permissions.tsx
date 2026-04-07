import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { requestNotificationPermissions } from '../../services/notificationService';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

const { height } = Dimensions.get('window');

function BellIcon() {
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring3 = useSharedValue(1);

  useEffect(() => {
    ring1.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    ring2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1.8, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    ring3.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(2.2, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }], opacity: 2 - ring1.value }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }], opacity: Math.max(0, 2 - ring2.value) }));
  const r3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3.value }], opacity: Math.max(0, 2 - ring3.value) }));

  return (
    <View style={styles.bellContainer}>
      <Animated.View style={[styles.ring, styles.ring1, r1Style]} />
      <Animated.View style={[styles.ring, styles.ring2, r2Style]} />
      <Animated.View style={[styles.ring, styles.ring3, r3Style]} />
      <View style={styles.bellIcon}>
        <Text style={styles.bellEmoji}>🔔</Text>
      </View>
    </View>
  );
}

export default function StepPermissions() {
  const router = useRouter();

  const handleAllow = async () => {
    await requestNotificationPermissions();
    router.push('/onboarding/step-first-week');
  };

  const handleSkip = () => {
    router.push('/onboarding/step-first-week');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />

      <Text style={styles.stepLabel}>Step 3 of 4</Text>

      <BellIcon />

      <View style={styles.textContainer}>
        <Text style={styles.title}>Let Velura greet{'\n'}you every morning</Text>
        <Text style={styles.subtitle}>
          Velura will send you a gentle notification at your chosen time
          every morning to help you start your day with clarity and purpose.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.allowButton} onPress={handleAllow} activeOpacity={0.8}>
          <Text style={styles.allowText}>Allow Notifications 🔔</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  stepLabel: {
    color: Colors.textUltraMuted,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    letterSpacing: Theme.letterSpacing.wide,
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  bellContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: `rgba(167,139,250,0.3)`,
  },
  ring1: { width: 90, height: 90 },
  ring2: { width: 110, height: 110 },
  ring3: { width: 130, height: 130 },
  bellIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellEmoji: {
    fontSize: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  allowButton: {
    backgroundColor: Colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  allowText: {
    color: '#fff',
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
  },
});
