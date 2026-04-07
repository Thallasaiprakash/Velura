import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Task,
  DayKey,
  WeekData,
  getTodayKey,
  getWeekId,
  getWeekTasks,
  saveWeekTasks,
  updateTaskCompletion,
  getTodaysTasks,
  createTask,
  TaskPriority,
  EMPTY_WEEK,
} from '../services/taskService';
import { useAuth } from './useAuth';

// ==================== HOOK ====================

export function useTasks() {
  const { userId } = useAuth();
  const [weekData, setWeekData] = useState<WeekData>({ ...EMPTY_WEEK });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekId = getWeekId();
  const todayKey = getTodayKey();

  // Load week data
  const loadWeek = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getWeekTasks(userId, weekId);
      setWeekData(data);
    } catch (e) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [userId, weekId]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // Get tasks for a specific day
  const getTasksForDay = useCallback(
    (day: DayKey): Task[] => weekData.days[day] || [],
    [weekData]
  );

  // Today's tasks
  const todayTasks = weekData.days[todayKey] || [];
  const pendingTasks = todayTasks.filter((t) => !t.completed);
  const completedTasks = todayTasks.filter((t) => t.completed);
  const allTodayDone = todayTasks.length > 0 && pendingTasks.length === 0;

  // Add task to a day
  const addTask = useCallback(
    async (day: DayKey, text: string, priority: TaskPriority = 'normal', timeTag?: string) => {
      if (!userId || !text.trim()) return;
      const newTask = createTask(text.trim(), priority);
      if (timeTag) newTask.timeTag = timeTag;

      const updatedWeek = { ...weekData };
      updatedWeek.days[day] = [...(updatedWeek.days[day] || []), newTask];
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Delete task
  const deleteTask = useCallback(
    async (day: DayKey, taskId: string) => {
      if (!userId) return;
      const updatedWeek = { ...weekData };
      updatedWeek.days[day] = updatedWeek.days[day].filter((t) => t.id !== taskId);
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Toggle task completion
  const toggleTask = useCallback(
    async (day: DayKey, taskId: string) => {
      if (!userId) return;
      const task = weekData.days[day]?.find((t) => t.id === taskId);
      if (!task) return;

      const updatedWeek = { ...weekData };
      updatedWeek.days[day] = updatedWeek.days[day].map((t) =>
        t.id === taskId
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
          : t
      );
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Carry forward incomplete tasks to next day
  const carryForwardTasks = useCallback(
    async (fromDay: DayKey, toDay: DayKey) => {
      if (!userId) return;
      const incompleteTasks = weekData.days[fromDay]?.filter((t) => !t.completed) || [];
      if (incompleteTasks.length === 0) return;

      const carriedTasks = incompleteTasks.map((t) => ({
        ...createTask(t.text, t.priority),
        carriedForward: true,
        category: t.category,
        timeTag: t.timeTag,
      }));

      const updatedWeek = { ...weekData };
      updatedWeek.days[toDay] = [...(updatedWeek.days[toDay] || []), ...carriedTasks];
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Clear all tasks for a day
  const clearDay = useCallback(
    async (day: DayKey) => {
      if (!userId) return;
      const updatedWeek = { ...weekData };
      updatedWeek.days[day] = [];
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Reorder tasks for a day
  const reorderTasks = useCallback(
    async (day: DayKey, newOrder: Task[]) => {
      if (!userId) return;
      const updatedWeek = { ...weekData };
      updatedWeek.days[day] = newOrder;
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  // Set tasks for an entire day (used in onboarding)
  const setDayTasks = useCallback(
    async (tasks: Record<DayKey, Task[]>) => {
      if (!userId) return;
      const updatedWeek = { ...weekData, days: { ...weekData.days, ...tasks } };
      setWeekData(updatedWeek);
      await saveWeekTasks(userId, weekId, updatedWeek);
    },
    [userId, weekId, weekData]
  );

  return {
    weekData,
    loading,
    error,
    todayKey,
    todayTasks,
    pendingTasks,
    completedTasks,
    allTodayDone,
    getTasksForDay,
    addTask,
    deleteTask,
    toggleTask,
    carryForwardTasks,
    clearDay,
    reorderTasks,
    setDayTasks,
    reload: loadWeek,
  };
}
