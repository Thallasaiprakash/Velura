import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

// ==================== CONSTANTS ====================

export const MORNING_GREETING_TASK = 'VELURA_MORNING_GREETING';
export const STREAK_CHECK_TASK = 'VELURA_STREAK_CHECK';
export const NOTIFICATION_IDS = {
  morning: 'velura-morning-greeting',
  weekly: 'velura-weekly-planner',
  night: 'velura-night-reminder',
};

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

// ==================== CANCEL ====================

export async function cancelNotification(identifier: string): Promise<void> {
  try {
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
