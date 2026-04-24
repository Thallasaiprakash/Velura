import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrbAnimation } from '../components/OrbAnimation';
import { OrbitalBackground } from '../components/OrbitalBackground';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { TaskCard } from '../components/TaskCard';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { useVoice } from '../hooks/useVoice';
import { useAuth } from '../hooks/useAuth';
import { getTodaysTasks, Task } from '../services/taskService';
import { buildGreeting } from '../services/speechService';
import { loadStreakData } from '../hooks/useStreak';
import { USERNAME_KEY } from './onboarding/step-name';
import { VOICE_STYLE_KEY } from './onboarding/step-voice';
import { VoiceStyle } from '../services/speechService';

const { width, height } = Dimensions.get('window');
const OVERLAY_DATE_KEY = 'velura_last_overlay_date';

export default function UnlockOverlay() {
  const router = useRouter();
  const { userId } = useAuth();
  const { speaking, speak, stop } = useVoice();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Animation values
  const timeOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(30);
  const greetingOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);

  // Swipe to dismiss
  const panY = useSharedValue(0);
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dy) > 10 && gestureState.dy < 0,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        panY.value = gestureState.dy;
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -80) {
        handleDismiss();
      } else {
        panY.value = withSpring(0);
      }
    },
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panY.value }],
  }));

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;

    // Check if we already showed the overlay today
    const today = new Date().toDateString();
    const lastDate = await AsyncStorage.getItem(OVERLAY_DATE_KEY);
    if (lastDate === today) {
      // Already shown today — go to home
      router.replace('/(tabs)/');
      return;
    }

    // Check sleep hours (10 PM - 5 AM)
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      router.replace('/(tabs)/');
      return;
    }

    // Load data
    const [todayTasks, name, voiceStyle, streakData] = await Promise.all([
      getTodaysTasks(userId),
      AsyncStorage.getItem(USERNAME_KEY),
      AsyncStorage.getItem(VOICE_STYLE_KEY),
      loadStreakData(),
    ]);

    const finalName = name || 'Friend';
    const style = (voiceStyle as VoiceStyle) || 'calm';
    const pendingTasks = todayTasks.filter((t) => !t.completed);
    const done = todayTasks.length > 0 && pendingTasks.length === 0;

    // Build greeting
    const greetingText = buildGreeting(finalName, todayTasks, style, streakData.badge);

    // Format time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    setTasks(todayTasks);
    setUserName(finalName);
    setGreeting(greetingText);
    setCurrentTime(timeStr);
    setAllDone(done);
    setLoaded(true);

    // Mark shown today
    await AsyncStorage.setItem(OVERLAY_DATE_KEY, today);

    // Start animations
    setTimeout(() => {
      timeOpacity.value = withTiming(1, { duration: 400 });
      greetingOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
      greetingTranslateY.value = withDelay(400, withSpring(0, { damping: 14 }));
      subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      actionsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));

      // Auto-play voice after 800ms
      setTimeout(() => {
        speak(greetingText, style);
      }, 800);
    }, 200);
  };

  const handleDismiss = async () => {
    await stop();
    router.replace('/(tabs)/');
  };

  const handleOpenApp = async () => {
    await stop();
    router.replace('/(tabs)/');
  };

  const timeStyle = useAnimatedStyle(() => ({ opacity: timeOpacity.value }));
  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value }));
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} hidden />
      <OrbitalBackground variant="home" />

      <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Time */}
          <Animated.Text style={[styles.time, timeStyle]}>{currentTime}</Animated.Text>

          {/* Orb */}
          <View style={styles.orbContainer}>
            <OrbAnimation size={width * 0.52} />
          </View>

          {/* Waveform */}
          <View style={styles.waveformContainer}>
            <VoiceWaveform isActive={speaking} />
          </View>

          {/* Greeting */}
          <Animated.Text style={[styles.greeting, greetingStyle]}>
            {allDone
              ? `All done today, ${userName}! 🎉`
              : `Good morning, ${userName}! 👋`}
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            {allDone
              ? 'Every task is complete. You\'re on fire!'
              : `You have ${pendingCount} task${pendingCount !== 1 ? 's' : ''} for today`}
          </Animated.Text>

          {/* Task cards */}
          {loaded && tasks.length > 0 && (
            <View style={styles.tasksList}>
              {tasks.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} />
              ))}
            </View>
          )}

          {tasks.length === 0 && loaded && (
            <View style={styles.emptyTasks}>
              <Text style={styles.emptyText}>No tasks for today — enjoy your free day! ✨</Text>
            </View>
          )}

          {/* Swipe hint */}
          <Text style={styles.swipeHint}>↑ Swipe up to dismiss</Text>
        </ScrollView>

        {/* Bottom actions */}
        <Animated.View style={[styles.actions, actionsStyle]}>
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenApp} activeOpacity={0.8}>
            <Text style={styles.openBtnText}>Open Velura</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 160,
    paddingHorizontal: 24,
  },
  time: {
    color: Colors.textMuted,
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -1,
    marginBottom: 24,
  },
  orbContainer: {
    marginVertical: 8,
  },
  waveformContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 32,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  tasksList: {
    width: '100%',
    gap: 2,
  },
  emptyTasks: {
    paddingVertical: 20,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: Theme.fontSize.md,
  },
  swipeHint: {
    color: Colors.textUltraMuted,
    fontSize: Theme.fontSize.xs,
    marginTop: 32,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'rgba(7,7,26,0.9)',
    gap: 12,
  },
  openBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  openBtnText: {
    color: '#fff',
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  dismissText: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.md,
  },
});
