import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../hooks/useAuth';
import { loadStreakData, updateStreak, StreakData } from '../../hooks/useStreak';
import { TaskRow } from '../../components/TaskRow';
import { ProgressRing } from '../../components/ProgressRing';
import { StreakBadge } from '../../components/StreakBadge';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { buildGreeting, VoiceStyle } from '../../services/speechService';
import { Task, DayKey } from '../../services/taskService';
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
  const { todayTasks, todayKey, allTodayDone, toggleTask, addTask, deleteTask, loading, reload } = useTasks();
  const { speak } = useVoice();

  const [userName, setUserName] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('calm');
  const [streakData, setStreakData] = useState<StreakData>({ count: 0, lastCompletedDate: null, badge: null });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userId, allTodayDone]);

  const loadUserData = async () => {
    const [name, style] = await Promise.all([
      AsyncStorage.getItem(USERNAME_KEY),
      AsyncStorage.getItem(VOICE_STYLE_KEY),
    ]);
    if (name) setUserName(name);
    if (style) setVoiceStyle(style as VoiceStyle);

    // Update streak
    const newStreak = await updateStreak(allTodayDone);
    setStreakData(newStreak);
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
    await addTask(todayKey, newTaskText.trim());
    setNewTaskText('');
    setShowAddModal(false);
  };

  const handleReplayGreeting = () => {
    const text = buildGreeting(userName, todayTasks, voiceStyle, streakData.badge);
    speak(text, voiceStyle);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const completedCount = todayTasks.filter((t) => t.completed).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>
              {getGreetingPrefix()}, {userName || 'Friend'} 👋
            </Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
          <Svg width={40} height={40} viewBox="0 0 100 100">
            <Ellipse cx="50" cy="50" rx="40" ry="22" fill="none" stroke={Colors.primary} strokeWidth="3" />
            <Circle cx="50" cy="50" r="16" fill="none" stroke={Colors.primary} strokeWidth="2.5" />
            <Circle cx="50" cy="50" r="7" fill={Colors.primary} />
          </Svg>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSub}>
              {allTodayDone
                ? '🎉 All tasks complete!'
                : `${todayTasks.length - completedCount} remaining`}
            </Text>
            {/* Progress dots */}
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

        {/* Streak */}
        {streakData.count > 0 && (
          <View style={styles.section}>
            <StreakBadge count={streakData.count} badge={streakData.badge} />
          </View>
        )}

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            <Text style={styles.sectionMeta}>{completedCount}/{todayTasks.length} done</Text>
          </View>
          {todayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks for today ✨</Text>
              <Text style={styles.emptySubText}>Tap "Add task" below to get started</Text>
            </View>
          ) : (
            <View style={styles.taskList}>
              {/* Urgent first */}
              {todayTasks
                .filter((t) => t.priority === 'urgent' && !t.completed)
                .map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              {/* Normal tasks */}
              {todayTasks
                .filter((t) => t.priority !== 'urgent' || t.completed)
                .map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
            </View>
          )}
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
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalBtn} onPress={handleAddTask}>
                <Text style={styles.addModalText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greetingText: { color: Colors.textPrimary, fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.bold },
  dateText: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginTop: 2 },
  progressCard: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.lg, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', marginBottom: 16 },
  progressLeft: { flex: 1, marginRight: 12 },
  progressTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold, marginBottom: 4 },
  progressSub: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginBottom: 12 },
  progressDots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
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
});
