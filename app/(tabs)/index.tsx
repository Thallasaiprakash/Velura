import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../hooks/useAuth';
import { loadStreakData, updateStreak, StreakData } from '../../hooks/useStreak';
import { ProgressRing } from '../../components/ProgressRing';
import { StreakBadge } from '../../components/StreakBadge';
import { TaskOrbit } from '../../components/TaskOrbit';
import { FlowTunnelModal } from '../../components/FlowTunnelModal';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { buildGreeting } from '../../services/speechService';
import { Task, DayKey, UserProfile, VoiceStyle, saveUserProfile, Chronotype } from '../../services/taskService';
import { ElegantNotification } from '../../components/ElegantNotification';
import { requestNotificationPermissions, isTaskDueNow } from '../../services/notificationService';
import { getSuggestions } from '../../services/suggestionService';
import { deconstructTask } from '../../services/aiService';
import { getCurrentEnergyState, getEnergyDescription } from '../../services/auraService';
import { parseNeuralVenting, NeuralVentedTask } from '../../services/aiService';
import * as Haptics from 'expo-haptics';
import { USERNAME_KEY } from '../onboarding/step-name';
import { VOICE_STYLE_KEY } from '../onboarding/step-voice';
import Svg, { Ellipse, Circle } from 'react-native-svg';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { todayTasks, todayKey, allTodayDone, toggleTask, addTask, deleteTask, loading, syncing, reload, carryForwardTasks } = useTasks();

  const { speak, speaking } = useVoice();
  const [userName, setUserName] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('calm');
  const [streakData, setStreakData] = useState<StreakData>({ count: 0, lastCompletedDate: null, badge: null });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showInAppNotify, setShowInAppNotify] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifySubtitle, setNotifySubtitle] = useState('');
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const currentEnergy = getCurrentEnergyState(userProfile?.chronotype);
  const [lastAlertedTime, setLastAlertedTime] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showChronotypeModal, setShowChronotypeModal] = useState(false);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [activeTunnelTask, setActiveTunnelTask] = useState<Task | null>(null);
  
  // Neural Vent State
  const [showVentModal, setShowVentModal] = useState(false);
  const [ventText, setVentText] = useState('');
  const [isVenting, setIsVenting] = useState(false);

  // Session Stars (Achievement Stars)
  const [achievementStars, setAchievementStars] = useState<number>(0);
  const sessionBriefingDone = useRef(false);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem(USERNAME_KEY);
      const style = await AsyncStorage.getItem(VOICE_STYLE_KEY) as VoiceStyle;
      const profileJson = await AsyncStorage.getItem('userProfile');
      
      if (name) setUserName(name);
      if (style) setVoiceStyle(style);
      
      if (profileJson) {
        try {
          setUserProfile(JSON.parse(profileJson));
        } catch (e) {
          console.warn('Failed to parse user profile:', e);
        }
      }

      const streak = await loadStreakData();
      setStreakData(streak);

      // Initialize achievement stars for the session
      if (todayTasks) {
        const tasksCompleted = todayTasks.filter(t => t.completed).length;
        setAchievementStars(tasksCompleted);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadUserData();
        const granted = await requestNotificationPermissions();
        if (!granted) {
          console.log('Notification permissions not granted');
        }
      } catch (e) {
        console.warn('Init error:', e);
      }
    };
    init();

    // Check onboarding status
    const checkOnboarding = async () => {
      try {
        const name = await AsyncStorage.getItem(USERNAME_KEY);
        if (!name) {
          router.replace('/onboarding/step-name');
        }
      } catch (e) {
        console.warn('Onboarding check error:', e);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Prevent double briefing on startup
    if (sessionBriefingDone.current) return;
    
    const initSession = async () => {
      try {
        // Wait for tasks to be loaded from Firebase
        if (loading) return;
        
        await reload();
        
        const name = await AsyncStorage.getItem(USERNAME_KEY);
        const morningDone = await AsyncStorage.getItem(`briefing_done_${new Date().toDateString()}`);
        
        if (!morningDone && name) {
          const greeting = buildGreeting(name, todayTasks, voiceStyle);
          // Wait a bit before speaking to ensure UI is ready
          setTimeout(() => {
            speak(greeting, voiceStyle);
          }, 1500);
          await AsyncStorage.setItem(`briefing_done_${new Date().toDateString()}`, 'true');
        }
        
        sessionBriefingDone.current = true;
      } catch (e) {
        console.error('Session init error:', e);
      }
    };

    initSession();
  }, [loading, voiceStyle]);

  const handleReplayGreeting = () => {
    const text = buildGreeting(userName, todayTasks, voiceStyle, streakData.badge);
    speak(text, voiceStyle);
  };

  const triggerVoiceBriefing = useCallback(async (tasksToUse: Task[]) => {
    const now = Date.now();
    if (now - lastVoiceTriggerRef.current < VOICE_COOLDOWN_MS) {
      console.log('[Briefing] Voice cooldown active, skipping.');
      return;
    }
    
    if (sessionBriefingDone.current) {
      console.log('[Briefing] Session briefing already completed.');
      return;
    }

    lastVoiceTriggerRef.current = now;
    sessionBriefingDone.current = true;

    console.log('[Briefing] Auto-triggering voice briefing...');
    const text = buildGreeting(userName, tasksToUse, voiceStyle, streakData.badge);
    speak(text, voiceStyle);
  }, [userName, voiceStyle, streakData.badge, speak]);

  const checkAndShowNotification = async (overrideTasks?: Task[]) => {
    if (loading || !userProfile?.notifyOnUnlock) return;

    const tasksToUse = overrideTasks || todayTasks;
    const pending = tasksToUse.filter(t => !t.completed);
    
    if (pending.length > 0) {
      const nowHours = new Date().getHours();
      const isEvening = nowHours >= 21; 

      if (isEvening && userProfile?.bedtimeSummary) {
        setNotifyTitle("Gentleman's Review");
        setNotifySubtitle(`It's late, ${userName}. Shall we reschedule your ${pending.length} remaining tasks?`);
        setNotifyAction("Move");
      } else {
        setNotifyTitle("Agenda Briefing");
        setNotifySubtitle(`You have ${pending.length} tasks pending. Reading them for you now...`);
        setNotifyAction("Speak");
        
        setTimeout(() => {
          if (AppState.currentState === 'active') {
            triggerVoiceBriefing(tasksToUse);
          }
        }, 800);
      }
      
      setShowInAppNotify(true);
      await AsyncStorage.setItem('velura_last_foreground_notify', Date.now().toString());
    }
  };

  const [notifyAction, setNotifyAction] = useState<'Speak' | 'Move'>('Speak');
  const lastVoiceTriggerRef = useRef<number>(0);
  const VOICE_COOLDOWN_MS = 30000;

  const handleNotificationAction = async () => {
    setShowInAppNotify(false);
    if (notifyAction === 'Speak') {
      handleReplayGreeting();
    } else {
      const tomorrowKey = getTomorrowKey();
      await carryForwardTasks(todayKey, tomorrowKey);
      setNotifyTitle("Tasks Moved");
      setNotifySubtitle("I've rescheduled them for tomorrow. Rest well.");
      setNotifyAction('Speak'); 
      setShowInAppNotify(true);
      setTimeout(() => setShowInAppNotify(false), 3000);
    }
  };

  const checkNotifyRef = useRef(checkAndShowNotification);
  const reloadRef = useRef(reload);
  
  useEffect(() => {
    checkNotifyRef.current = checkAndShowNotification;
    reloadRef.current = reload;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkNotifyRef.current();
        reloadRef.current().catch(e => console.error('[AppState] Background sync failed', e));
      }
    });

    if (!loading) {
      checkNotifyRef.current();
    }

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
      
      if (lastAlertedTime === currentMinute) return;

      const dueTask = todayTasks.find(t => !t.completed && isTaskDueNow(t.timeTag));
      if (dueTask) {
        setNotifyTitle("Task Alert ⚡");
        setNotifySubtitle(dueTask.text);
        setNotifyAction("Speak");
        setShowInAppNotify(true);
        setLastAlertedTime(currentMinute);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [todayTasks, lastAlertedTime]);

  useEffect(() => {
    if (!loading && userProfile?.notifyOnUnlock && todayTasks.length > 0) {
      const pending = todayTasks.filter(t => !t.completed);
      if (pending.length > 0 && !sessionBriefingDone.current) {
        const checkColdStartBriefing = async () => {
          const lastNotify = await AsyncStorage.getItem('velura_last_foreground_notify');
          const now = Date.now();
          if (!lastNotify || now - parseInt(lastNotify) > VOICE_COOLDOWN_MS) {
            setNotifyTitle("Agenda Briefing");
            setNotifySubtitle(`You have ${pending.length} tasks pending. Reading them for you now...`);
            setNotifyAction("Speak");
            setShowInAppNotify(true);
            
            setTimeout(() => {
              if (AppState.currentState === 'active') {
                triggerVoiceBriefing(todayTasks);
              }
            }, 1200);
            
            await AsyncStorage.setItem('velura_last_foreground_notify', now.toString());
          }
        };
        checkColdStartBriefing();
      }
    }
  }, [loading, userProfile?.notifyOnUnlock, todayTasks.length]);

  const getTomorrowKey = (): DayKey => {
    const days: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const tomorrow = (new Date().getDay() + 1) % 7;
    return days[tomorrow];
  };

  const togglePreference = async (key: keyof UserProfile, value: any) => {
    const updated = { ...userProfile, [key]: value } as UserProfile;
    setUserProfile(updated);
    
    const storageKey = `velura_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
    await AsyncStorage.setItem(storageKey, String(value));
    
    if (userId) {
      await saveUserProfile(userId, { [key]: value });
    }

    if (typeof value === 'boolean') {
        setNotifyTitle("Preference Saved");
        setNotifySubtitle(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} is now ${value ? 'Enabled' : 'Disabled'}.`);
        setNotifyAction('Speak');
        setShowInAppNotify(true);
        setTimeout(() => setShowInAppNotify(false), 2000);
    }
  };

  const handleSetChronotype = async (ct: Chronotype) => {
    await togglePreference('chronotype', ct);
    setShowChronotypeModal(false);
    setNotifyTitle("Bio-Sync Active ⚡");
    setNotifySubtitle(`Optimizing tasks for a ${ct} state.`);
    setNotifyAction('Speak');
    setShowInAppNotify(true);
    setTimeout(() => setShowInAppNotify(false), 3000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggle = useCallback(
    (taskId: string) => {
      toggleTask(todayKey, taskId);
    },
    [todayKey, toggleTask]
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      deleteTask(todayKey, taskId);
    },
    [todayKey, deleteTask]
  );

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    await addTask(todayKey, newTaskText.trim(), 'normal', newTaskTime || undefined);
    setNewTaskText('');
    setNewTaskTime('');
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    if (showAddModal) {
      getSuggestions().then(setSuggestions);
    }
  }, [showAddModal]);

  const selectSuggestion = (text: string) => {
    setNewTaskText(text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeconstruct = async (taskId: string, text: string) => {
    setIsDeconstructing(true);
    setNotifyTitle("AI Deconstruction");
    setNotifySubtitle(`Breaking down "${text}" into atomic steps...`);
    setNotifyAction("Speak");
    setShowInAppNotify(true);
    
    try {
      const subtasks = await deconstructTask(text);
      deleteTask(todayKey, taskId);
      for (const sub of subtasks) {
        await addTask(todayKey, sub.text, 'normal', sub.timeTag);
      }
      setNotifyTitle("Task Deconstructed ✨");
      setNotifySubtitle(`Created ${subtasks.length} simple steps.`);
      setTimeout(() => setShowInAppNotify(false), 3000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setNotifyTitle("Deconstruction Failed");
      setNotifySubtitle(e.message || "Could not reach the AI.");
      setTimeout(() => setShowInAppNotify(false), 4000);
    } finally {
      setIsDeconstructing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleNeuralVent = async () => {
    if (!ventText.trim()) return;
    setIsVenting(true);
    try {
      const parsedTasks = await parseNeuralVenting(ventText);
      for (const t of parsedTasks) {
        const mappedPriority = t.priority === 'High' ? 'urgent' : t.priority === 'Medium' ? 'normal' : 'low';
        await addTask(todayKey, t.text, mappedPriority);
      }
      setNotifyTitle('Neural Vent Processed ✨');
      setNotifySubtitle(`Extracted ${parsedTasks.length} tasks from your thoughts.`);
      setNotifyAction('Speak');
      setShowInAppNotify(true);
      setTimeout(() => setShowInAppNotify(false), 3000);
      setVentText('');
      setShowVentModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      let errorMsg = e.message || 'The Neural Engine could not decode your thoughts just yet.';
      if (errorMsg.includes('API Key Missing') || errorMsg.includes('YOUR_OPENAI_API_KEY_HERE')) {
        errorMsg = 'AI Configuration Required: Please update your OpenAI API Key in the settings or .env file to enable Neural Venting.';
      }
      setNotifyTitle('Neural Sync Interrupted');
      setNotifySubtitle(errorMsg);
      setShowInAppNotify(true);
      setTimeout(() => setShowInAppNotify(false), 6000); 
    } finally {
      setIsVenting(false);
    }
  };

  const completedCount = todayTasks.filter((t) => t.completed).length;

  const handleTaskOrbitComplete = async (taskId: string) => {
    handleToggle(taskId);
    const newVal = achievementStars + 1;
    setAchievementStars(newVal);
    await AsyncStorage.setItem('velura_session_stars', String(newVal));
  };

  if (loading && todayTasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundUniverse energyState={currentEnergy} achievementCount={achievementStars} />
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Synchronizing Universe...</Text>
          <Text style={styles.loadingSubtext}>Fetching your cosmic schedule</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <ElegantNotification
        visible={showInAppNotify}
        title={notifyTitle}
        subtitle={notifySubtitle}
        onDismiss={() => setShowInAppNotify(false)}
        onAction={handleNotificationAction}
        actionText={notifyAction}
        isVoiceActive={speaking}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>
              {getGreetingPrefix()}, {userName || 'Friend'} 👋
            </Text>
            <View style={styles.auraBadge}>
               <Text style={styles.auraBadgeText}>
                 {userProfile?.chronotype ? getEnergyDescription(getCurrentEnergyState(userProfile.chronotype)) : formatDate()}
               </Text>
            </View>
          </View>
          <View style={styles.auraContainer}>
            <Svg width={40} height={40} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="50" rx="40" ry="22" fill="none" 
                  stroke={getCurrentEnergyState(userProfile?.chronotype) === 'force' ? Colors.danger : getCurrentEnergyState(userProfile?.chronotype) === 'flow' ? Colors.success : Colors.primary} 
                  strokeWidth="3" />
              <Circle cx="50" cy="50" r="16" fill="none" stroke={Colors.textPrimary} strokeWidth="2.5" />
              <Circle cx="50" cy="50" r="7" fill={getCurrentEnergyState(userProfile?.chronotype) === 'force' ? Colors.danger : getCurrentEnergyState(userProfile?.chronotype) === 'flow' ? Colors.success : Colors.primary} />
              {syncing && (
                <Circle cx="50" cy="50" r="45" fill="none" stroke={Colors.primary} strokeWidth="2" strokeDasharray="10 10" />
              )}
            </Svg>
            <View style={[styles.auraGlow, { backgroundColor: getCurrentEnergyState(userProfile?.chronotype) === 'force' ? Colors.danger : getCurrentEnergyState(userProfile?.chronotype) === 'flow' ? Colors.success : Colors.primary }]} />
          </View>
        </View>

        {syncing && (
          <View style={styles.syncingBanner}>
             <Text style={styles.syncingText}>Updating your schedule...</Text>
          </View>
        )}

        <View style={styles.progressCard}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSub}>
              {allTodayDone
                ? '🎉 All tasks complete!'
                : `${todayTasks.length - completedCount} remaining`}
            </Text>
            <View style={styles.progressDots}>
              {todayTasks.map((t, i) => (
                <View
                  key={t.id}
                  style={[
                    styles.progressDot,
                    { backgroundColor: t.completed ? Colors.success : Colors.primary },
                  ]}
                />
              ))}
            </View>
          </View>
          <ProgressRing total={todayTasks.length} completed={completedCount} size={100} />
        </View>

        {streakData.count > 0 && (
          <View style={styles.section}>
            <StreakBadge count={streakData.count} badge={streakData.badge} />
          </View>
        )}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Task Orbit</Text>
            <Text style={styles.sectionMeta}>{completedCount}/{todayTasks.length} done</Text>
          </View>
          {isDeconstructing ? (
            <View style={styles.emptyState}>
               <Svg width={40} height={40} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="45" fill="none" stroke={Colors.primary} strokeWidth="2" strokeDasharray="10 10" />
               </Svg>
               <Text style={[styles.emptyText, { marginTop: 16 }]}>Consulting the Oracle...</Text>
               <Text style={styles.emptySubText}>Breaking down your task into atomic chunks.</Text>
            </View>
          ) : todayTasks.filter((t) => !t.completed).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No pending tasks ✨</Text>
              <Text style={styles.emptySubText}>You are clear to rest.</Text>
            </View>
          ) : (
            <View style={styles.orbitWrapper}>
               <TaskOrbit 
                 tasks={todayTasks} 
                 onCompleteTask={handleTaskOrbitComplete} 
                 onEnterTunnel={(task) => setActiveTunnelTask(task)} 
                 chronotype={userProfile?.chronotype as Chronotype}
                 achievementStars={achievementStars}
               />
               {/* Achievement Count Overlay */}
               {achievementStars > 0 && (
                 <View style={styles.constellationBadge}>
                    <Text style={styles.constellationText}>⭐ {achievementStars} Stars in your Constellation</Text>
                 </View>
               )}
            </View>
          )}
        </View>

        {/* Preferences Toggle Section */}
        <View style={styles.prefsSection}>
          <TouchableOpacity 
            style={[styles.prefPill, userProfile?.notifyOnUnlock && styles.prefPillActive]}
            onPress={() => togglePreference('notifyOnUnlock', !userProfile?.notifyOnUnlock)}
          >
            <Text style={[styles.prefText, userProfile?.notifyOnUnlock && styles.prefTextActive]}>
              {userProfile?.notifyOnUnlock ? '🔔 Auto-Notify On' : '🔕 Auto-Notify Off'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.prefPill, userProfile?.morningGreeting && styles.prefPillActive]}
            onPress={() => togglePreference('morningGreeting', !userProfile?.morningGreeting)}
          >
            <Text style={[styles.prefText, userProfile?.morningGreeting && styles.prefTextActive]}>
              {userProfile?.morningGreeting ? '🌅 Morning Greeting On' : '💤 Morning Silent'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/planner')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Edit week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReplayGreeting} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🔊</Text>
            <Text style={styles.actionText}>Replay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>+</Text>
            <Text style={[styles.actionText, { color: '#fff' }]}>Add task</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.quickActions, { marginTop: 12 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: Colors.primary }]}
            onPress={() => setShowVentModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🎤</Text>
            <Text style={[styles.actionText, { color: Colors.primary }]}>Neural Vent</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bio-Calibration Modal */}
      <Modal visible={showChronotypeModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={[styles.modalSheet, { paddingBottom: 30 }]}>
            <Text style={{ fontSize: 24, marginBottom: 10 }}>🧬</Text>
            <Text style={styles.modalTitle}>Bio-Calibration</Text>
            <Text style={[styles.emptySubText, { marginBottom: 24, textAlign: 'left' }]}>
              VELURA isn't just a calendar. It's a bio-sync engine. When do you feel most unstoppable?
            </Text>
            
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={styles.chronotypeCard} onPress={() => handleSetChronotype('lark')}>
                <Text style={styles.chronotypeIcon}>🌅</Text>
                <View>
                  <Text style={styles.chronotypeTitle}>Morning Lark</Text>
                  <Text style={styles.chronotypeDesc}>Peak energy early in the day.</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.chronotypeCard} onPress={() => handleSetChronotype('owl')}>
                <Text style={styles.chronotypeIcon}>🦉</Text>
                <View>
                  <Text style={styles.chronotypeTitle}>Night Owl</Text>
                  <Text style={styles.chronotypeDesc}>Unstoppable after the sun sets.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.chronotypeCard} onPress={() => handleSetChronotype('third-bird')}>
                <Text style={styles.chronotypeIcon}>🦅</Text>
                <View>
                  <Text style={styles.chronotypeTitle}>The Standard</Text>
                  <Text style={styles.chronotypeDesc}>Steady 9-to-5 momentum.</Text>
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Task for Today</Text>
            <TextInput
              style={styles.modalInput}
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="What do you need to do?"
              placeholderTextColor={Colors.textUltraMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddTask}
            />
            <TextInput
              style={[styles.modalInput, { fontSize: Theme.fontSize.sm }]}
              value={newTaskTime}
              onChangeText={setNewTaskTime}
              placeholder="Time (optional, e.g. 2:10 pm)"
              placeholderTextColor={Colors.textUltraMuted}
            />
            
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.suggestionTitle}>Suggested for you</Text>
                  <Text style={styles.suggestionHelp}>Tap to select</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.suggestionsList}
                >
                  {suggestions.map((s, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.suggestionPill}
                      onPress={() => selectSuggestion(s)}
                    >
                      <Text style={styles.suggestionText}>+ {s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalBtn} onPress={handleAddTask}>
                <Text style={styles.addModalText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Neural Vent Modal */}
      <Modal visible={showVentModal} transparent animationType="slide" onRequestClose={() => setShowVentModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Neural Vent 🧠</Text>
            <Text style={[styles.emptySubText, { marginBottom: 16, textAlign: 'left' }]}>
              Dump your chaotic thoughts, anxieties, and scattered to-dos. The AI will extract and structure actionable tasks for you.
            </Text>
            <TextInput
              style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
              value={ventText}
              onChangeText={setVentText}
              placeholder="E.g., I'm so stressed about the tax forms, also need to mail the package today, and oh I should probably call mom..."
              placeholderTextColor={Colors.textUltraMuted}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVentModal(false)} disabled={isVenting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalBtn} onPress={handleNeuralVent} disabled={isVenting}>
                <Text style={styles.addModalText}>{isVenting ? 'Processing...' : 'Deconstruct Thoughts'}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Flow Tunnel Modal */}
      <FlowTunnelModal 
        visible={!!activeTunnelTask} 
        task={activeTunnelTask} 
        onClose={(completed) => {
          if (completed && activeTunnelTask) {
            handleToggle(activeTunnelTask.id);
          }
          setActiveTunnelTask(null);
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greetingText: { color: Colors.textPrimary, fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.bold },
  dateText: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginTop: 2 },
  auraBadge: { backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.radius.md, marginTop: 6 },
  auraBadgeText: { color: Colors.primary, fontSize: Theme.fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  auraContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  auraGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, opacity: 0.2 }, // Simulate glow
  progressCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    borderRadius: Theme.radius.lg, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderWidth: 1, 
    borderColor: 'rgba(167, 139, 250, 0.1)', 
    marginBottom: 16,
  },
  progressLeft: { flex: 1, marginRight: 12 },
  progressTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold, marginBottom: 4 },
  progressSub: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginBottom: 12 },
  progressDots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  orbitWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  constellationBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: 'rgba(167,139,250,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  constellationText: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold },
  sectionMeta: { color: Colors.textMuted, fontSize: Theme.fontSize.sm },
  taskList: { gap: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: Colors.textMuted, fontSize: Theme.fontSize.md, marginBottom: 4 },
  emptySubText: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.sm },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)' },
  actionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionText: { color: Colors.textMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, marginBottom: 16 },
  modalInput: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingHorizontal: 16, paddingVertical: 14, color: Colors.textPrimary, fontSize: Theme.fontSize.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Theme.radius.full, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  cancelText: { color: Colors.textMuted, fontSize: Theme.fontSize.md },
  addModalBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: Theme.radius.full, backgroundColor: Colors.primary },
  addModalText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  prefsSection: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  prefPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Theme.radius.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  prefPillActive: { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: Colors.primary },
  prefText: { color: Colors.textMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium },
  prefTextActive: { color: Colors.primary },
  syncingBanner: { 
    backgroundColor: 'rgba(167,139,250,0.1)', 
    borderRadius: Theme.radius.md, 
    paddingVertical: 8, 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)'
  },
  syncingText: {
    color: Colors.primary,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  actionBtnDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.bgSurface,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionHelp: {
    color: Colors.textUltraMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  suggestionsList: {
    paddingRight: 20,
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radius.lg,
  },
  suggestionText: {
    color: Colors.primary,
    fontSize: Theme.fontSize.sm,
    fontWeight: '700',
  },
  chronotypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    padding: 16,
    borderRadius: Theme.radius.md,
    gap: 16
  },
  chronotypeIcon: {
    fontSize: 28,
  },
  chronotypeTitle: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
  chronotypeDesc: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.xs,
    marginTop: 2
  }
});
