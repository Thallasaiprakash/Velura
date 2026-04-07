import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BadgeLevel = 'bronze' | 'silver' | 'gold' | null;

const STREAK_STORAGE_KEY = 'velura_streak_data';

export interface StreakData {
  count: number;
  lastCompletedDate: string | null; // ISO date string YYYY-MM-DD
  badge: BadgeLevel;
}

export function getStreakBadge(count: number): BadgeLevel {
  if (count >= 21) return 'gold';
  if (count >= 7) return 'silver';
  if (count >= 3) return 'bronze';
  return null;
}

export function getBadgeEmoji(badge: BadgeLevel): string {
  switch (badge) {
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'bronze': return '🥉';
    default: return '';
  }
}

export async function loadStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return { count: 0, lastCompletedDate: null, badge: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastCompletedDate: null, badge: null };
  }
}

export async function updateStreak(allTasksDone: boolean): Promise<StreakData> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await loadStreakData();

  if (!allTasksDone) {
    // Check if we broke the streak (missed a day)
    if (existing.lastCompletedDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (existing.lastCompletedDate < yesterdayStr) {
        // Streak broken
        const newData: StreakData = { count: 0, lastCompletedDate: existing.lastCompletedDate, badge: null };
        await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newData));
        return newData;
      }
    }
    return existing;
  }

  // All done today
  if (existing.lastCompletedDate === today) {
    return existing; // Already counted today
  }

  const newCount = existing.count + 1;
  const newData: StreakData = {
    count: newCount,
    lastCompletedDate: today,
    badge: getStreakBadge(newCount),
  };
  await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newData));
  return newData;
}

export function useStreak(streakData: StreakData) {
  const { count, badge } = streakData;

  const nextBadgeIn = useMemo(() => {
    if (count < 3) return { target: 'Bronze', days: 3 - count };
    if (count < 7) return { target: 'Silver', days: 7 - count };
    if (count < 21) return { target: 'Gold', days: 21 - count };
    return null;
  }, [count]);

  return {
    count,
    badge,
    badgeEmoji: getBadgeEmoji(badge),
    nextBadgeIn,
    isOnFire: count >= 3,
  };
}
