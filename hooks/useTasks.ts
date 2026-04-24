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
  getEmptyWeek,
  mergeWeekData,
  getLocalOnlyWeekData,
  clearLocalOnlyWeekData,
} from '../services/taskService';
import { useAuth } from './useAuth';
import * as Haptics from 'expo-haptics';
import { recordTaskUsage } from '../services/suggestionService';
import { scheduleTaskReminder, cancelNotification } from '../services/notificationService';

// ==================== HOOK ====================

export function useTasks() {
  const { userId } = useAuth();
  const [weekData, setWeekData] = useState<WeekData>(getEmptyWeek());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekId = getWeekId();
  const [todayKey, setTodayKey] = useState<DayKey>(getTodayKey());

  // Keep todayKey updated if the day passes
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getTodayKey();
      if (current !== todayKey) setTodayKey(current);
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [todayKey]);

  // Load week data
  const loadWeek = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setSyncing(true);
    
    try {
      console.log(`[useTasks] Loading week tasks (userId: ${userId || 'local-only'})...`);
      const data = await getWeekTasks(userId, weekId);
      
      setWeekData(prev => {
        try {
          // Validation: If data is null or malformed, return previous state
          if (!data || !data.days) {
            console.warn('[useTasks] Received invalid data from server, skipping merge.');
            return prev;
          }

          // If initial load and prev is empty, just take the data
          const isPrevEmpty = !prev || !prev.days || Object.values(prev.days).every(tasks => tasks.length === 0);
          if (isInitial && isPrevEmpty) {
            console.log('[useTasks] Initial data loaded');
            return data;
          }
          
          // Otherwise, safely merge to preserve any local-only changes
          console.log('[useTasks] Merging sync data with local state');
          return mergeWeekData(prev, data);
        } catch (mergeError) {
          console.error('[useTasks] Critical error during state merge:', mergeError);
          return prev; // Fallback to current state to prevent crash
        }
      });
      return data; // Return data for awaiting
    } catch (e) {
      console.error('[useTasks] Load failed:', e);
      setError('Failed to load tasks');
      throw e;
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [userId, weekId]);

  // Handle background sync when userId becomes available
  useEffect(() => {
    async function syncTasks() {
      if (!userId) return;
      
      try {
        console.log(`[useTasks] Syncing local-only tasks to server for user ${userId}...`);
        const localOnlyData = await getLocalOnlyWeekData(weekId);
        
        if (localOnlyData && localOnlyData.updatedAt > 0) {
          const serverData = await getWeekTasks(userId, weekId);
          const merged = mergeWeekData(localOnlyData, serverData);
          
          await saveWeekTasks(userId, weekId, merged);
          await clearLocalOnlyWeekData(weekId);
          
          setWeekData(merged);
          console.log('[useTasks] Sync completed successfully');
        } else {
          // If no local-only data, just ensure we have the server data
          loadWeek(false);
        }
      } catch (err: any) {
        console.error('[useTasks] Sync process encountered an error:', err);
        // Do not rethrow here to prevent unhandled promise rejection crashes
        setError(`Sync failed: ${err.message || 'Unknown error'}`);
      }
    }

    syncTasks();
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

  // Sync completion count for the cosmic background
  useEffect(() => {
    const syncStars = async () => {
      const completedCount = todayTasks.filter(t => t.completed).length;
      await AsyncStorage.setItem('velura_session_stars', completedCount.toString());
    };
    syncStars();
  }, [todayTasks]);

  // Add task to a day
  const addTask = useCallback(
    async (day: DayKey, text: string, priority: TaskPriority = 'normal', timeTag?: string) => {
      if (!text.trim()) return;

      console.log(`[useTasks] Adding task: "${text}" with priority ${priority} (userId: ${userId || 'local-only'})`);
      const newTask = createTask(text.trim(), priority, timeTag || null);
      
      // Schedule notification if it's for today and has a time tag
      if (day === todayKey && timeTag) {
        const notifId = await scheduleTaskReminder(newTask.text, timeTag, priority);
        if (notifId) newTask.notificationId = notifId;
      }

      // Record for auto-suggest intelligence
      recordTaskUsage(text.trim());

      setWeekData(prev => {
        const updatedDays = { ...prev.days };
        updatedDays[day] = [...(updatedDays[day] || []), newTask];
        const updatedWeek = { ...prev, days: updatedDays, updatedAt: Date.now() };
        
        // Save to storage/firebase in background
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('[useTasks] Background save failed:', err)
        );
        
        // Tactile feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        return updatedWeek;
      });
    },
    [userId, weekId, todayKey]
  );

  // Delete task
  const deleteTask = useCallback(
    async (day: DayKey, taskId: string) => {
      
      setWeekData(prev => {
        const taskToDelete = prev.days[day]?.find(t => t.id === taskId);
        if (taskToDelete?.notificationId) {
          cancelNotification(taskToDelete.notificationId);
        }

        const updatedDays = { ...prev.days };
        updatedDays[day] = (updatedDays[day] || []).filter((t) => t.id !== taskId);
        const updatedWeek = { ...prev, days: updatedDays, updatedAt: Date.now() };
        
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('Failed to delete task in background:', err)
        );
        
        // Tactile feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  // Toggle task completion
  const toggleTask = useCallback(
    async (day: DayKey, taskId: string) => {

      setWeekData(prev => {
        const dayTasks = prev.days[day] || [];
        const task = dayTasks.find((t) => t.id === taskId);
        if (!task) return prev;

        // If completing, cancel notification
        if (!task.completed && task.notificationId) {
          cancelNotification(task.notificationId);
        }

        const updatedDays = { ...prev.days };
        updatedDays[day] = dayTasks.map((t) =>
          t.id === taskId
            ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null, updatedAt: Date.now() }
            : t
        );
        const updatedWeek = { ...prev, days: updatedDays, updatedAt: Date.now() };
        
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('Failed to toggle task in background:', err)
        );
        
        // Tactile feedback
        if (!task.completed) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  // Carry forward incomplete tasks to next day
  const carryForwardTasks = useCallback(
    async (fromDay: DayKey, toDay: DayKey) => {
      setWeekData(prev => {
        const incompleteTasks = prev.days[fromDay]?.filter((t) => !t.completed) || [];
        if (incompleteTasks.length === 0) return prev;

        const carriedTasks = incompleteTasks.map((t) => ({
          ...createTask(t.text, t.priority, t.timeTag),
          carriedForward: true,
          category: t.category,
        }));

        const updatedDays = { ...prev.days };
        updatedDays[toDay] = [...(updatedDays[toDay] || []), ...carriedTasks];
        const updatedWeek = { ...prev, days: updatedDays, updatedAt: Date.now() };
        
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('Failed to carry forward in background:', err)
        );
        
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  // Clear all tasks for a day
  const clearDay = useCallback(
    async (day: DayKey) => {

      setWeekData(prev => {
        // Cancel all notifications for that day
        const tasks = prev.days[day] || [];
        tasks.forEach((t) => {
          if (t.notificationId) cancelNotification(t.notificationId);
        });

        const updatedDays = { ...prev.days };
        updatedDays[day] = [];
        const updatedWeek = { ...prev, days: updatedDays };
        
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('Failed to clear day in background:', err)
        );
        
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  // Simple reorder (can be expanded for drag-and-drop)
  const reorderTasks = useCallback(
    async (day: DayKey, newTasks: Task[]) => {
      
      setWeekData(prev => {
        const updatedDays = { ...prev.days };
        updatedDays[day] = newTasks;
        const updatedWeek = { ...prev, days: updatedDays };
        
        saveWeekTasks(userId, weekId, updatedWeek).catch(err => 
          console.error('Failed to reorder tasks in background:', err)
        );
        
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  // Set tasks for an entire day (used in onboarding)
  const setDayTasks = useCallback(
    async (tasks: Record<DayKey, Task[]>) => {
      setWeekData(prev => {
        const updatedWeek = { ...prev, days: { ...prev.days, ...tasks }, updatedAt: Date.now() };
        saveWeekTasks(userId, weekId, updatedWeek);
        return updatedWeek;
      });
    },
    [userId, weekId]
  );

  return {
    userId,
    weekData,
    loading,
    syncing,
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
    reload: async () => await loadWeek(false),
  };
}
