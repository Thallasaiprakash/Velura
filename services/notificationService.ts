import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform, AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, getTodaysTasks, TaskPriority } from './taskService';
import { playGreeting, buildGreeting } from './speechService';

// ==================== CONSTANTS ====================

export const MORNING_GREETING_TASK = 'VELURA_MORNING_GREETING';
export const STREAK_CHECK_TASK = 'VELURA_STREAK_CHECK';
export const VELURA_UNLOCK_TASK = 'VELURA_UNLOCK_TASK';
export const NOTIFICATION_IDS = {
  morning: 'velura-morning-greeting',
  weekly: 'velura-weekly-planner',
  night: 'velura-night-reminder',
};

const { VeluraAlarmModule } = NativeModules;

// ==================== SETUP ====================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ==================== PERMISSIONS ====================

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('velura-default', {
      name: 'VELURA',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a78bfa',
    });
    await Notifications.setNotificationChannelAsync('velura-morning', {
      name: 'Morning Greeting',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#a78bfa',
      sound: 'default',
    });
  }

  return true;
}

// ==================== MORNING GREETING ====================

export async function scheduleMorningGreeting(
  userName: string,
  hour: number,
  minute: number,
  greetingDays: number[] = [0, 1, 2, 3, 4, 5, 6]
): Promise<void> {
  // Cancel existing morning greeting
  await cancelNotification(NOTIFICATION_IDS.morning);

  // Schedule for each enabled day
  for (const dayOfWeek of greetingDays) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_IDS.morning}-${dayOfWeek}`,
      content: {
        title: 'VELURA ✨',
        body: `Good morning, ${userName}! Your day is ready. Tap to see it.`,
        data: { type: 'morning_unlock', userName },
        sound: 'default',
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'velura-morning',
          color: '#a78bfa',
        }),
      },
      trigger: {
        weekday: dayOfWeek + 1, // expo uses 1=Sunday, 2=Monday...
        hour,
        minute,
        repeats: true,
      } as Notifications.WeeklyTriggerInput,
    });
  }
}

// ==================== WEEKLY PLANNER REMINDER ====================

export async function scheduleWeeklyPlannerReminder(userName: string): Promise<void> {
  await cancelNotification(NOTIFICATION_IDS.weekly);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.weekly,
    content: {
      title: 'VELURA 📋',
      body: `Hey ${userName}, let's plan your week! Tap to set up next week's tasks.`,
      data: { type: 'weekly_planner' },
      sound: 'default',
      ...(Platform.OS === 'android' && {
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: 'velura-default',
        color: '#a78bfa',
      }),
    },
    trigger: {
      weekday: 1, // Sunday (1=Sunday in expo)
      hour: 20,   // 8 PM
      minute: 0,
      repeats: true,
    } as Notifications.WeeklyTriggerInput,
  });
}

// ==================== NIGHT REMINDER ====================

export async function scheduleNightReminder(userName: string, pendingCount: number): Promise<string> {
  await cancelNotification(NOTIFICATION_IDS.night);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.night,
    content: {
      title: 'VELURA 🌙',
      body: `Hey ${userName}, day's winding down. Still have ${pendingCount} task${pendingCount !== 1 ? 's' : ''}. Want to reschedule them?`,
      data: { type: 'night_reminder' },
      sound: 'default',
      ...(Platform.OS === 'android' && {
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        channelId: 'velura-default',
        color: '#a78bfa',
      }),
    },
    trigger: null, // immediate
  });
  return id;
}

export async function scheduleNightReminderAt9PM(userName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIFICATION_IDS.night}-daily`,
    content: {
      title: 'VELURA 🌙',
      body: `Hey ${userName}, checking in — got pending tasks tonight?`,
      data: { type: 'night_check' },
      sound: 'default',
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}

/**
 * Parses time tags like "2:10 pm", "14:30", "5pm", "at 5pm" into hour and minute.
 * Improved to handle spaces, dots, and other common separators.
 */
export function parseTimeTag(timeTag: string): { hour: number; minute: number } | null {
  if (!timeTag) return null;

  const input = timeTag.toLowerCase().trim();
  // Regex for 12h or 24h format: handles 2:10pm, 2.10pm, 2 10 pm, 14:30, 5pm, etc.
  const timeRegex = /(?:at\s+)?(\d{1,2})(?:[:.\s](\d{2}))?\s*([ap]m)?/i;
  const match = input.match(timeRegex);

  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];

  // Adjust for AM/PM
  if (ampm === 'pm' && hour < 12) hour += 12;
  else if (ampm === 'am' && hour === 12) hour = 0;
  // If no AM/PM, and hour is 1-11, assume it might be PM if it's currently later than that?
  // No, let's stick to standard 24h or explicit AM/PM to avoid confusion.

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/**
 * Checks if a task with a specific timeTag is due within the current minute.
 */
export function isTaskDueNow(timeTag: string | null): boolean {
  if (!timeTag) return false;
  const parsed = parseTimeTag(timeTag);
  if (!parsed) return false;

  const now = new Date();
  return now.getHours() === parsed.hour && now.getMinutes() === parsed.minute;
}

/**
 * Returns a formal gentleman-style message for empty tasks.
 */
export function getGentlemanEmptyMessage(): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `It appears your agenda for this ${timeOfDay} is currently clear. A rare moment of tranquility.`;
}

/**
 * Schedules a one-time notification for a specific task based on its timeTag.
 * Now integrated with Native AlarmManager for synchronized Voice + Text.
 */
export async function scheduleTaskReminder(
  taskText: string, 
  timeTag: string, 
  priority: TaskPriority = 'normal'
): Promise<string | null> {
  const parsed = parseTimeTag(timeTag);
  if (!parsed) return null;

  const { hour, minute } = parsed;

  // Schedule for TODAY
  const now = new Date();
  let triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

  // If time has already passed today, schedule for tomorrow
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  // Ensure it's at least 30 seconds into the future to avoid immediate rejection
  if (triggerDate.getTime() - now.getTime() < 30000) {
    triggerDate = new Date(now.getTime() + 60000); // Set to 1 minute from now
  }

  // ALWAYS use the Native Alarm for voice on Android — this is the core USP of VELURA
  // The native alarm triggers BOTH text notification AND voice speech simultaneously
  try {
    if (Platform.OS === 'android' && VeluraAlarmModule) {
      console.log(`[NotificationService] Scheduling NATIVE Voice Alarm for: ${taskText} at ${triggerDate.getTime()}`);
      VeluraAlarmModule.scheduleAlarm(
        triggerDate.getTime(),
        '🔊 VELURA Reminder',
        taskText,
        taskText + timeTag // Using text+time as unique ID
      );
      // We return a "native" identifier format
      return `native-${taskText}-${timeTag}`;
    }
  } catch (e) {
    console.warn('[NotificationService] Native alarm scheduling failed, falling back to Expo:', e);
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VELURA Task ⚡',
        body: taskText,
        data: { type: 'task_reminder', taskText },
        sound: 'default',
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'velura-default',
          color: '#a78bfa',
        }),
      },
      trigger: triggerDate,
    });
    return identifier;
  } catch (error) {
    console.error('Error scheduling task reminder:', error);
    return null;
  }
}

// ==================== CANCEL ====================

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    if (identifier.startsWith('native-')) {
      if (Platform.OS === 'android' && VeluraAlarmModule) {
        VeluraAlarmModule.cancelAlarm(identifier.replace('native-', ''));
      }
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(identifier);
    // Also cancel day variants
    for (let i = 0; i < 7; i++) {
      await Notifications.cancelScheduledNotificationAsync(`${identifier}-${i}`).catch(() => {});
    }
  } catch {}
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ==================== BACKGROUND TASKS ====================

export function registerBackgroundTasks(): void {
  if (!TaskManager.isTaskDefined(STREAK_CHECK_TASK)) {
    TaskManager.defineTask(STREAK_CHECK_TASK, async () => {
      try {
        // This is called by BackgroundFetch
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

    // NOTE: VELURA_UNLOCK_TASK is now handled by the native UnlockReceiver
    // which fires a native notification + SharedPreferences flag.
    // Voice playback is triggered via AppState listener and post-load 
    // useEffect in the HomeScreen component. This avoids the broken
    // TaskManager broadcast chain that doesn't work when the app is killed.
}

export async function registerBackgroundFetch(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(STREAK_CHECK_TASK, {
      minimumInterval: 60 * 60, // every hour
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.log('Background fetch registration failed:', error);
  }
}

// ==================== AUTO-REGISTRATION ====================
// CRITICAL: Call this at the top level of the module to ensure 
// Headless JS tasks are registered when the app is killed.
registerBackgroundTasks();
