import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { getWeekTasks, getWeekId, DayKey, Task } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

const DAYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getMotivationalMessage(pct: number): string {
  if (pct >= 100) return "🏆 Perfect week! You completed every single task. That's exceptional.";
  if (pct >= 80) return '⭐ Outstanding work! You crushed it this week. Keep this momentum going!';
  if (pct >= 60) return '💪 Solid effort! More than half the week conquered. Next week, push even further.';
  if (pct >= 40) return "🌱 Good start. Challenges happen. What you learn this week shapes next week's wins.";
  return '🔄 Every week is a fresh start. Tomorrow is a new chance. Plan boldly for next week!';
}

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, perfectDays: 0 });
  const [dayStats, setDayStats] = useState<{ day: DayKey; total: number; done: number }[]>([]);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    if (!userId) return;
    const weekId = getWeekId();
    const weekData = await getWeekTasks(userId, weekId);

    let total = 0;
    let completed = 0;
    let perfectDays = 0;
    const ds: typeof dayStats = [];

    DAYS.forEach((day) => {
      const tasks = weekData.days[day] || [];
      const doneTasks = tasks.filter((t) => t.completed).length;
      total += tasks.length;
      completed += doneTasks;
      if (tasks.length > 0 && doneTasks === tasks.length) perfectDays++;
      ds.push({ day, total: tasks.length, done: doneTasks });
    });

    setStats({ total, completed, perfectDays });
    setDayStats(ds);
  };

  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Weekly Review 📊</Text>
        <Text style={styles.subtitle}>Here's how your week went</Text>

        {/* Big stat card */}
        <View style={styles.bigCard}>
          <Text style={styles.pctNumber}>{pct}%</Text>
          <Text style={styles.pctLabel}>tasks completed</Text>
          <Text style={styles.tasksDetail}>{stats.completed} of {stats.total} tasks done</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Perfect days */}
        {stats.perfectDays > 0 && (
          <View style={styles.perfectDaysCard}>
            <Text style={styles.perfectDaysText}>🌟 {stats.perfectDays} perfect day{stats.perfectDays !== 1 ? 's' : ''} this week!</Text>
          </View>
        )}

        {/* Motivational message */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationText}>{getMotivationalMessage(pct)}</Text>
        </View>

        {/* Day breakdown */}
        <Text style={styles.sectionTitle}>Day Breakdown</Text>
        {dayStats.map(({ day, total, done }) => (
          <View key={day} style={styles.dayRow}>
            <Text style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
            <View style={styles.dayBar}>
              <View style={[styles.dayBarFill, { width: total > 0 ? `${(done / total) * 100}%` : '0%', backgroundColor: done === total && total > 0 ? Colors.success : Colors.primary }]} />
            </View>
            <Text style={styles.dayCount}>{total > 0 ? `${done}/${total}` : '—'}</Text>
          </View>
        ))}

        {/* CTA */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/(tabs)/planner')} activeOpacity={0.8}>
            <Text style={styles.planBtnText}>Plan Next Week →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/')} activeOpacity={0.7}>
            <Text style={styles.homeBtnText}>Go to Today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  title: { color: Colors.textPrimary, fontSize: Theme.fontSize.xxl, fontWeight: Theme.fontWeight.bold, marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, marginBottom: 28 },
  bigCard: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.xl, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', marginBottom: 16 },
  pctNumber: { color: Colors.primary, fontSize: 72, fontWeight: '200', lineHeight: 80 },
  pctLabel: { color: Colors.textMuted, fontSize: Theme.fontSize.md, marginBottom: 6 },
  tasksDetail: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.sm, marginBottom: 16 },
  progressBar: { width: '100%', height: 8, backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  perfectDaysCard: { backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: Theme.radius.md, padding: 14, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)', marginBottom: 12, alignItems: 'center' },
  perfectDaysText: { color: Colors.success, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  motivationCard: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(167,139,250,0.1)' },
  motivationText: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, lineHeight: 24, textAlign: 'center' },
  sectionTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold, marginBottom: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  dayName: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, width: 72 },
  dayBar: { flex: 1, height: 6, backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 3, overflow: 'hidden' },
  dayBarFill: { height: '100%', borderRadius: 3 },
  dayCount: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.xs, width: 32, textAlign: 'right' },
  actions: { marginTop: 32, gap: 12 },
  planBtn: { backgroundColor: Colors.primary, borderRadius: Theme.radius.full, paddingVertical: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6 },
  planBtnText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  homeBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: Theme.radius.full, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  homeBtnText: { color: Colors.textMuted, fontSize: Theme.fontSize.md },
});
