import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ElegantNotificationProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onDismiss: () => void;
  onAction?: () => void;
  actionText?: string;
  type?: 'task' | 'greeting' | 'success';
  isVoiceActive?: boolean;
}

export function ElegantNotification({
  visible,
  title,
  subtitle,
  onDismiss,
  onAction,
  actionText = 'View',
  type = 'task',
  isVoiceActive = false,
}: ElegantNotificationProps) {
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const voicePulseScale = useSharedValue(1);
  const voicePulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 600 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1,
        true
      );
    } else {
      translateY.value = withSpring(-220, { damping: 20 });
      opacity.value = withTiming(0, { duration: 400 });
    }
  }, [visible]);

  useEffect(() => {
    if (isVoiceActive) {
      voicePulseOpacity.value = withTiming(0.6, { duration: 300 });
      voicePulseScale.value = withRepeat(
        withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
    } else {
      voicePulseOpacity.value = withTiming(0, { duration: 500 });
      voicePulseScale.value = withTiming(1);
    }
  }, [isVoiceActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: withSpring(visible ? 1 : 0.95) }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: withRepeat(withTiming(1.2, { duration: 3000 }), -1, true) }],
  }));

  const voicePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: voicePulseScale.value }],
    opacity: voicePulseOpacity.value,
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 95} tint="dark" style={styles.blurContainer}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            {isVoiceActive && (
              <Animated.View style={[styles.voicePulseRing, voicePulseStyle]} />
            )}
            <Text style={styles.iconEmoji}>{isVoiceActive ? '🎙️' : (type === 'task' ? '⚡' : '✨')}</Text>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.actions}>
            {onAction && (
              <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
                <Text style={styles.actionText}>{actionText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bottomAccent} />
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(10,10,18,0.7)',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomAccent: {
    height: 2,
    width: '100%',
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  voicePulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(167,139,250,0.3)',
  },
});
