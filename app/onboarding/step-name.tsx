import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { ParticleField } from '../../components/ParticleField';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

const { height } = Dimensions.get('window');
export const USERNAME_KEY = 'velura_user_name';

export default function StepName() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const borderGlow = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      borderGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      borderGlow.value = withTiming(0, { duration: 300 });
    }
  }, [focused]);

  const inputContainerStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(167,139,250,${0.2 + borderGlow.value * 0.6})`,
    shadowColor: Colors.primary,
    shadowOpacity: borderGlow.value * 0.5,
    shadowRadius: 12 * borderGlow.value,
    elevation: focused ? 6 : 0,
  }));

  const isValid = name.trim().length >= 3;

  const handleContinue = async () => {
    if (!isValid) return;
    await AsyncStorage.setItem(USERNAME_KEY, name.trim());
    router.push('/onboarding/step-voice');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      <ParticleField count={10} />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Svg width={60} height={60} viewBox="0 0 100 100">
          <Ellipse cx="50" cy="50" rx="40" ry="22" fill="none" stroke={Colors.primary} strokeWidth="2.5" />
          <Circle cx="50" cy="50" r="16" fill="none" stroke={Colors.primary} strokeWidth="2" />
          <Circle cx="50" cy="50" r="7" fill={Colors.primary} />
        </Svg>
        <Text style={styles.logoText}>VELURA</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 1 of 4</Text>
        <Text style={styles.title}>What should Velura{'\n'}call you?</Text>
        <Text style={styles.caption}>
          Velura will speak your name every time{'\n'}you unlock your phone
        </Text>

        <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name..."
            placeholderTextColor={Colors.textUltraMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            maxLength={30}
          />
        </Animated.View>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: height * 0.1,
    gap: 8,
  },
  logoText: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: Theme.letterSpacing.widest,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  stepLabel: {
    color: Colors.textUltraMuted,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    letterSpacing: Theme.letterSpacing.wide,
    marginBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    lineHeight: 40,
    marginBottom: 12,
  },
  caption: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.bgSurface,
    marginBottom: 24,
  },
  input: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.medium,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
