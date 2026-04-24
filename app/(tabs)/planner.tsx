import React, { useState, useCallback, useEffect } from 'react';
import { getCurrentEnergyState } from '../../services/auraService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { WeekDayTabs, DAYS } from '../../components/WeekDayTabs';
import { TaskRow } from '../../components/TaskRow';
import { DayKey, Task, createTask, TaskPriority, Chronotype } from '../../services/taskService';
import { useTasks } from '../../hooks/useTasks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { BackgroundUniverse } from '../../components/BackgroundUniverse';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: '🔴 Urgent', color: Colors.urgent },
  { value: 'normal', label: '🟣 Normal', color: Colors.primary },
  { value: 'low', label: '⚪ Low', color: Colors.low },
];

const QUICK_CHIPS = ['Meeting', 'Gym', 'Doctor', 'Deadline', 'Call', 'Workout', 'Study', 'Review'];

export default function PlannerScreen() {
  const { userId, weekData, getTasksForDay, addTask, deleteTask, toggleTask, clearDay, reorderTasks, loading, reload } = useTasks();

  // Default to today's day
  const todayIdx = (new Date().getDay() + 6) % 7;
  const [selectedDay, setSelectedDay] = useState<DayKey>(DAYS[todayIdx]?.key || 'monday');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('normal');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [chronotype, setChronotype] = useState<Chronotype>('bear');
  const [achievementStars, setAchievementStars] = useState(0);
  const currentEnergy = getCurrentEnergyState(chronotype);

  useEffect(() => {
    const loadData = async () => {
      const saved = await AsyncStorage.getItem('velura_chronotype');
      if (saved) setChronotype(saved as Chronotype);
      const stars = await AsyncStorage.getItem('velura_session_stars');
      if (stars) setAchievementStars(parseInt(stars));
    };
    loadData();
    
    // Poll for changes to stay in sync with Settings/Home
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentTasks = getTasksForDay(selectedDay);
  const completedCount = currentTasks.filter((t) => t.completed).length;

  // Build task counts for tab badges
  const taskCounts = Object.fromEntries(
    DAYS.map(({ key }) => {
      const tasks = getTasksForDay(key);
      return [key, { total: tasks.length, done: tasks.filter((t) => t.completed).length }];
    })
  ) as Record<DayKey, { total: number; done: number }>;

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    await addTask(selectedDay, newTaskText.trim(), selectedPriority, newTaskTime || undefined);
    setNewTaskText('');
    setNewTaskTime('');
    setSelectedPriority('normal');
    setShowAddModal(false);
  };

  const handleClearDay = () => {
    Alert.alert('Clear all tasks', `Remove all tasks for ${selectedDay}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearDay(selectedDay) },
    ]);
  };

  const selectedDayLabel = DAYS.find((d) => d.key === selectedDay)?.label || '';

  return (
    <View style={styles.container}>
      <BackgroundUniverse 
        energyState={currentEnergy} 
        achievementCount={achievementStars} 
      />

      
      {/* Header */}
      <BlurView intensity={30} tint="dark" style={styles.header}>
        <Text style={styles.title}>Cosmic Planner</Text>
        <Text style={styles.subtitle}>Align your tasks with the universe</Text>
      </BlurView>

      {/* Day tabs */}
      <WeekDayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} taskCounts={taskCounts} />

      {/* Day header */}
      <View style={styles.dayHeader}>
        <View>
          <Text style={styles.dayTitle}>{selectedDayLabel}</Text>
          <Text style={styles.dayMeta}>{completedCount}/{currentTasks.length} tasks done</Text>
        </View>
        <View style={styles.dayActions}>
          {currentTasks.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearDay} activeOpacity={0.7}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Task list */}
      <ScrollView style={styles.taskScroll} contentContainerStyle={styles.taskContent} showsVerticalScrollIndicator={false}>
        {currentTasks.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>Add some tasks for {selectedDayLabel}</Text>
          </View>
        ) : (
          currentTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(id) => toggleTask(selectedDay, id)}
              onDelete={(id) => deleteTask(selectedDay, id)}
              chronotype={chronotype}
            />
          ))
        )}

        {/* Quick add chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>Quick add:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {QUICK_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.chip}
                onPress={() => addTask(selectedDay, chip)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Add button */}
      <View style={styles.addContainer}>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => setShowAddModal(true)} 
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Task — {selectedDayLabel}</Text>

            <TextInput
              style={styles.modalInput}
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="Task description..."
              placeholderTextColor={Colors.textUltraMuted}
              autoFocus
              multiline
              maxLength={120}
            />

            <TextInput
              style={[styles.modalInput, styles.timeInput]}
              value={newTaskTime}
              onChangeText={setNewTaskTime}
              placeholder="Time (optional, e.g. 9:00 AM)"
              placeholderTextColor={Colors.textUltraMuted}
            />

            {/* Priority selector */}
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.priorityOpt, selectedPriority === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}20` }]}
                  onPress={() => setSelectedPriority(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.priorityText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalBtn} onPress={handleAddTask}>
                <Text style={styles.addModalBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  title: { color: Colors.textPrimary, fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.bold, letterSpacing: -0.5 },
  subtitle: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginTop: 2 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  dayTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold },
  dayMeta: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.sm, marginTop: 2 },
  dayActions: { flexDirection: 'row', gap: 8 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.05)' },
  clearText: { color: Colors.danger, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.bold },
  taskScroll: { flex: 1 },
  taskContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyDay: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: Colors.textMuted, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, marginBottom: 4 },
  emptySubtitle: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.sm },
  chipsSection: { marginTop: 24 },
  chipsLabel: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.xs, marginBottom: 8, fontWeight: Theme.fontWeight.medium },
  chipsRow: { gap: 8 },
  chip: { 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: Theme.radius.full, 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1, 
    borderColor: 'rgba(167, 139, 250, 0.1)' 
  },
  chipText: { color: Colors.primary, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold },
  addContainer: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Theme.radius.full, paddingVertical: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6 },
  addBtnText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingBottom: 40,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, marginBottom: 16 },
  modalInput: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingHorizontal: 16, paddingVertical: 14, color: Colors.textPrimary, fontSize: Theme.fontSize.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', marginBottom: 12 },
  timeInput: { fontSize: Theme.fontSize.sm },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityOpt: { flex: 1, paddingVertical: 8, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', alignItems: 'center' },
  priorityText: { color: Colors.textMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Theme.radius.full, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  cancelText: { color: Colors.textMuted, fontSize: Theme.fontSize.md },
  addModalBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: Theme.radius.full, backgroundColor: Colors.primary },
  addModalBtnText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  addBtnDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});
