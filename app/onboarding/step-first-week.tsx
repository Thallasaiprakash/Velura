import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeekId, saveWeekTasks, DayKey, Task, createTask, getEmptyWeek, WeekData } from '../../services/taskService';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { USERNAME_KEY } from './step-name';
import { scheduleMorningGreeting, scheduleWeeklyPlannerReminder } from '../../services/notificationService';
import { VOICE_STYLE_KEY } from './step-voice';
import { useAuth } from '../../hooks/useAuth';

const ONBOARDING_KEY = 'velura_onboarding_done';

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const QUICK_CHIPS = ['Meeting', 'Gym', 'Doctor', 'Project deadline', 'Call', 'Workout', 'Study'];

export default function StepFirstWeek() {
  const router = useRouter();
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayKey>('monday');
  const [dayTasks, setDayTasks] = useState<Record<DayKey, Task[]>>(
    Object.fromEntries(DAYS.map((d) => [d.key, [] as Task[]])) as Record<DayKey, Task[]>
  );
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(USERNAME_KEY).then((n) => {
      if (n) setName(n);
    });
  }, []);

  const addTask = (text: string) => {
    if (!text.trim()) return;
    const tasks = dayTasks[selectedDay] || [];
    if (tasks.length >= 6) return;
    const newTask = createTask(text.trim());
    setDayTasks((prev) => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), newTask],
    }));
    setInputText('');
  };

  const removeTask = (day: DayKey, taskId: string) => {
    setDayTasks((prev) => ({
      ...prev,
      [day]: prev[day].filter((t) => t.id !== taskId),
    }));
  };

  const handleStart = async () => {
    if (!userId) return;

    const weekId = getWeekId();
    const weekData: WeekData = {
      weekOf: Date.now(),
      days: dayTasks,
      updatedAt: Date.now(),
    };
    await saveWeekTasks(userId, weekId, weekData);

    // Schedule notifications
    const voiceStyle = (await AsyncStorage.getItem(VOICE_STYLE_KEY)) || 'calm';
    await scheduleMorningGreeting(name, 7, 0);
    await scheduleWeeklyPlannerReminder(name);

    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/');
  };

  const currentTasks = dayTasks[selectedDay] || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.title}>Let's plan your week,{'\n'}{name}! 📅</Text>
        <Text style={styles.subtitle}>Add up to 6 tasks per day. You can always edit later.</Text>

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
          {DAYS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.dayTab, selectedDay === key && styles.dayTabSelected]}
              onPress={() => setSelectedDay(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayTabText, selectedDay === key && styles.dayTabTextSelected]}>
                {label.slice(0, 3)}
              </Text>
              {(dayTasks[key]?.length || 0) > 0 && (
                <View style={styles.taskCountDot}>
                  <Text style={styles.taskCountText}>{dayTasks[key].length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Current day tasks */}
        <View style={styles.taskList}>
          {currentTasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <Text style={styles.taskText}>{task.text}</Text>
              <TouchableOpacity onPress={() => removeTask(selectedDay, task.id)}>
                <Text style={styles.removeTask}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {currentTasks.length < 6 && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.taskInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Add a task for this day..."
                placeholderTextColor={Colors.textUltraMuted}
                returnKeyType="done"
                onSubmitEditing={() => addTask(inputText)}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => addTask(inputText)}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => addTask(chip)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CTA */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
          <Text style={styles.startBtnText}>Start my journey ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  stepLabel: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium, letterSpacing: Theme.letterSpacing.wide, marginBottom: 12 },
  title: { color: Colors.textPrimary, fontSize: 26, fontWeight: Theme.fontWeight.bold, lineHeight: 36, marginBottom: 8 },
  subtitle: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginBottom: 24, lineHeight: 20 },
  dayScroll: { flexGrow: 0 },
  dayScrollContent: { gap: 8, paddingBottom: 4 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Theme.radius.full, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', alignItems: 'center', flexDirection: 'row', gap: 5 },
  dayTabSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayTabText: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.medium },
  dayTabTextSelected: { color: '#fff', fontWeight: Theme.fontWeight.bold },
  taskCountDot: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  taskCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  taskList: { marginTop: 20, marginBottom: 16, gap: 8 },
  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.1)' },
  taskText: { flex: 1, color: Colors.textPrimary, fontSize: Theme.fontSize.md },
  removeTask: { color: Colors.textMuted, fontSize: 22, lineHeight: 24, marginLeft: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskInput: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, color: Colors.textPrimary, fontSize: Theme.fontSize.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '600' },
  chipScroll: { flexGrow: 0, marginBottom: 32 },
  chipContent: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Theme.radius.full, backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  chipText: { color: Colors.primary, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.medium },
  startBtn: { backgroundColor: Colors.primary, borderRadius: Theme.radius.full, paddingVertical: 18, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  startBtnText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
});
