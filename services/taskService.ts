import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES ====================

export type TaskPriority = 'urgent' | 'normal' | 'low';

export interface Task {
  id: string;
  text: string;
  priority: TaskPriority;
  completed: boolean;
  completedAt: number | null;
  timeTag: string | null;
  category: string | null;
  carriedForward: boolean;
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface WeekData {
  weekOf: number;
  days: Record<DayKey, Task[]>;
}

export interface UserProfile {
  name: string;
  voiceStyle: 'calm' | 'energetic' | 'formal';
  greetingTime: string;
  greetingDays: number[];
  smartSilence: boolean;
  streakCount: number;
  streakBadge: 'bronze' | 'silver' | 'gold' | null;
  weeklyFocusWord: string | null;
  createdAt: number;
  lastActiveAt: number;
}

// ==================== HELPERS ====================

export const getWeekId = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
};

export const getTodayKey = (): DayKey => {
  const days: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

export const createTask = (text: string, priority: TaskPriority = 'normal'): Task => ({
  id: uuidv4(),
  text,
  priority,
  completed: false,
  completedAt: null,
  timeTag: null,
  category: null,
  carriedForward: false,
});

export const EMPTY_WEEK: WeekData = {
  weekOf: Date.now(),
  days: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
};

// ==================== LOCAL CACHE ====================

const TASKS_CACHE_KEY = 'velura_tasks_cache';
const PROFILE_CACHE_KEY = 'velura_profile_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

// ==================== USER PROFILE ====================

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { ...profile, lastActiveAt: Date.now() }, { merge: true });
    const existing = await getCached<UserProfile>(PROFILE_CACHE_KEY);
    if (existing) {
      await setCached(PROFILE_CACHE_KEY, { ...existing, ...profile });
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    // Save locally if Firestore fails
    const existing = await getCached<UserProfile>(PROFILE_CACHE_KEY);
    await setCached(PROFILE_CACHE_KEY, { ...(existing || {}), ...profile } as UserProfile);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const cached = await getCached<UserProfile>(PROFILE_CACHE_KEY);
  if (cached) return cached;

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      await setCached(PROFILE_CACHE_KEY, data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// ==================== WEEK TASKS ====================

export async function getWeekTasks(userId: string, weekId: string): Promise<WeekData> {
  const cacheKey = `${TASKS_CACHE_KEY}_${weekId}`;
  const cached = await getCached<WeekData>(cacheKey);
  if (cached) return cached;

  try {
    const weekRef = doc(db, 'users', userId, 'weeks', weekId);
    const snap = await getDoc(weekRef);
    if (snap.exists()) {
      const data = snap.data() as WeekData;
      await setCached(cacheKey, data);
      return data;
    }
    return { ...EMPTY_WEEK, weekOf: Date.now() };
  } catch (error) {
    console.error('Error getting week tasks:', error);
    return { ...EMPTY_WEEK, weekOf: Date.now() };
  }
}

export async function saveWeekTasks(userId: string, weekId: string, weekData: WeekData): Promise<void> {
  try {
    const weekRef = doc(db, 'users', userId, 'weeks', weekId);
    await setDoc(weekRef, weekData, { merge: false });
    const cacheKey = `${TASKS_CACHE_KEY}_${weekId}`;
    await setCached(cacheKey, weekData);
  } catch (error) {
    console.error('Error saving week tasks:', error);
    const cacheKey = `${TASKS_CACHE_KEY}_${weekId}`;
    await setCached(cacheKey, weekData);
  }
}

export async function updateTaskCompletion(
  userId: string,
  weekId: string,
  day: DayKey,
  taskId: string,
  completed: boolean
): Promise<WeekData | null> {
  try {
    const weekData = await getWeekTasks(userId, weekId);
    const dayTasks = weekData.days[day];
    const taskIndex = dayTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return null;

    dayTasks[taskIndex] = {
      ...dayTasks[taskIndex],
      completed,
      completedAt: completed ? Date.now() : null,
    };
    weekData.days[day] = dayTasks;

    await saveWeekTasks(userId, weekId, weekData);
    return weekData;
  } catch (error) {
    console.error('Error updating task completion:', error);
    return null;
  }
}

export async function getTodaysTasks(userId: string): Promise<Task[]> {
  const weekId = getWeekId();
  const weekData = await getWeekTasks(userId, weekId);
  const todayKey = getTodayKey();
  return weekData.days[todayKey] || [];
}

// ==================== AUTO SUGGEST ====================

interface SuggestMap {
  [dayKey: string]: string[];
}

export async function getAutoSuggestions(userId: string, dayKey: DayKey): Promise<string[]> {
  try {
    // Look at past 4 weeks for the same day
    const suggestions: Record<string, number> = {};
    const now = new Date();

    for (let i = 1; i <= 4; i++) {
      const pastDate = new Date(now);
      pastDate.setDate(now.getDate() - i * 7);
      const weekId = getWeekId(pastDate);
      const weekData = await getWeekTasks(userId, weekId);
      const tasks = weekData.days[dayKey] || [];
      tasks.forEach((task) => {
        suggestions[task.text] = (suggestions[task.text] || 0) + 1;
      });
    }

    // Return tasks that appeared at least twice
    return Object.entries(suggestions)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([text]) => text)
      .slice(0, 5);
  } catch {
    return [];
  }
}
