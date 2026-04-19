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
// import { v4 as uuidv4 } from 'uuid'; // Removed due to potential native issues


// ==================== TYPES ====================

export type VoiceStyle = 'calm' | 'energetic' | 'formal' | 'gentleman';
export type TaskPriority = 'urgent' | 'normal' | 'low';
export type EnergyLevel = 'force' | 'flow' | 'fade';
export type Chronotype = 'lark' | 'owl' | 'third-bird';

export interface Task {
  id: string;
  text: string;
  priority: TaskPriority;
  completed: boolean;
  completedAt: number | null;
  timeTag: string | null;
  category: string | null;
  carriedForward: boolean;
  notificationId?: string;
  energyLevel: EnergyLevel;
  updatedAt: number;
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface WeekData {
  weekOf: number;
  days: Record<DayKey, Task[]>;
  updatedAt: number;
}

export interface UserProfile {
  name: string;
  voiceStyle: VoiceStyle;
  greetingTime: string;
  greetingDays: number[];
  smartSilence: boolean;
  notifyOnUnlock: boolean;
  morningGreeting: boolean;
  bedtimeSummary: boolean;
  voiceNotificationPreference: 'priority' | 'all';
  streakCount: number;
  streakBadge: 'bronze' | 'silver' | 'gold' | null;
  weeklyFocusWord: string | null;
  chronotype?: Chronotype;
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

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const createTask = (text: string, priority: TaskPriority = 'normal', timeTag: string | null = null, energyLevel: EnergyLevel = 'flow'): Task => ({
  id: generateId(),
  text,
  priority,
  completed: false,
  completedAt: null,
  timeTag,
  category: null,
  carriedForward: false,
  energyLevel,
  updatedAt: Date.now(),
});


export const getEmptyWeek = (): WeekData => ({
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
  updatedAt: 0,
});

/**
 * Safely merges two WeekData objects, preventing duplicates by task ID.
 * Prioritizes 'new' data but keeps any local tasks that may not have synced yet.
 */
export function mergeWeekData(local: WeekData, incoming: WeekData): WeekData {
  // If incoming is very old or empty, keep local
  if (incoming.updatedAt === 0 && local.updatedAt > 0) return local;

  const mergedDays = { ...getEmptyWeek().days };
  const allDayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of allDayKeys) {
    const localTasks = local.days[day] || [];
    const incomingTasks = incoming.days[day] || [];
    
    const taskMap = new Map<string, Task>();
    
    // First, seed with incoming tasks (the "source of truth" from server)
    incomingTasks.forEach(t => taskMap.set(t.id, t));
    
    // Then, overlay local tasks if they are newer OR don't exist in incoming
    localTasks.forEach(localTask => {
      const existing = taskMap.get(localTask.id);
      if (!existing || localTask.updatedAt > existing.updatedAt) {
        taskMap.set(localTask.id, localTask);
      }
    });
    
    mergedDays[day] = Array.from(taskMap.values());
  }

  return {
    ...incoming,
    days: mergedDays,
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
  };
}

// ==================== LOCAL CACHE ====================

const TASKS_CACHE_KEY = 'velura_tasks_cache';
const PROFILE_CACHE_KEY = 'velura_profile_cache';
const LOCAL_ONLY_TASKS_PREFIX = 'velura_local_only_tasks';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // Increase to 7 days for better offline support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // Log for debugging if needed
    // console.log(`[Cache] Found ${key}, age: ${(Date.now() - entry.timestamp)/1000}s`);
    
    return entry.data;
  } catch {
    return null;
  }
}

async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.error(`[Cache] Failed to set ${key}:`, e);
  }
}

// ==================== USER PROFILE ====================

export async function saveUserProfile(userId: string | null, profile: Partial<UserProfile>): Promise<void> {
  try {
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { ...profile, lastActiveAt: Date.now() }, { merge: true });
    }
    
    // Always update local cache regardless of auth state
    const existing = await getCached<UserProfile>(PROFILE_CACHE_KEY);
    await setCached(PROFILE_CACHE_KEY, { ...(existing || {}), ...profile } as UserProfile);
  } catch (error) {
    console.error('Error saving user profile:', error);
    // Fallback: Ensure local cache is updated even if Firestore fails
    const existing = await getCached<UserProfile>(PROFILE_CACHE_KEY);
    await setCached(PROFILE_CACHE_KEY, { ...(existing || {}), ...profile } as UserProfile);
  }
}

export async function getUserProfile(userId: string | null): Promise<UserProfile | null> {
  // Check cache first (covers both local and server users)
  const cached = await getCached<UserProfile>(PROFILE_CACHE_KEY);
  if (cached) return cached;

  // If no cache and no userId, we can't fetch from server
  if (!userId) return null;

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

export async function getWeekTasks(userId: string | null, weekId: string): Promise<WeekData> {
  const cacheKey = userId ? `${TASKS_CACHE_KEY}_${weekId}` : `${LOCAL_ONLY_TASKS_PREFIX}_${weekId}`;
  const cached = await getCached<WeekData>(cacheKey);
  if (cached) return cached;

  if (!userId) return getEmptyWeek();

  try {
    const weekRef = doc(db, 'users', userId, 'weeks', weekId);
    const snap = await getDoc(weekRef);
    if (snap.exists()) {
      const data = snap.data() as WeekData;
      // Ensure all days exist even if missing from DB
      const normalized = { ...getEmptyWeek(), ...data, days: { ...getEmptyWeek().days, ...data.days } };
      await setCached(cacheKey, normalized);
      return normalized;
    }
    return getEmptyWeek();
  } catch (error) {
    console.error('Error getting week tasks:', error);
    return getEmptyWeek();
  }
}

export async function saveWeekTasks(userId: string | null, weekId: string, weekData: WeekData): Promise<void> {
  const cacheKey = userId ? `${TASKS_CACHE_KEY}_${weekId}` : `${LOCAL_ONLY_TASKS_PREFIX}_${weekId}`;
  
  try {
    if (userId) {
      const weekRef = doc(db, 'users', userId, 'weeks', weekId);
      await setDoc(weekRef, weekData, { merge: false });
    }
    await setCached(cacheKey, weekData);
  } catch (error) {
    console.error('Error saving week tasks:', error);
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

/**
 * Retrieves data that was saved locally before the user was authenticated.
 */
export async function getLocalOnlyWeekData(weekId: string): Promise<WeekData | null> {
  const key = `${LOCAL_ONLY_TASKS_PREFIX}_${weekId}`;
  return getCached<WeekData>(key);
}

/**
 * Clears local-only data after it has been synced to the server.
 */
export async function clearLocalOnlyWeekData(weekId: string): Promise<void> {
  const key = `${LOCAL_ONLY_TASKS_PREFIX}_${weekId}`;
  await AsyncStorage.removeItem(key);
}
