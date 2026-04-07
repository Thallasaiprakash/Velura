import * as Speech from 'expo-speech';
import { getDailyQuote } from '../constants/quotes';
import { Task, UserProfile } from './taskService';

export type VoiceStyle = 'calm' | 'energetic' | 'formal';
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | null;

// ==================== VOICE PARAMS ====================

const VOICE_PARAMS: Record<VoiceStyle, Partial<Speech.SpeechOptions>> = {
  calm: {
    rate: 0.85,
    pitch: 0.95,
  },
  energetic: {
    rate: 1.1,
    pitch: 1.05,
  },
  formal: {
    rate: 0.9,
    pitch: 1.0,
  },
};

// ==================== GREETING BUILDER ====================

export function buildGreeting(
  name: string,
  tasks: Task[],
  voiceStyle: VoiceStyle,
  badgeLevel: BadgeLevel = null,
  focusWord: string | null = null
): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const pendingTasks = tasks.filter((t) => !t.completed);
  const urgentTasks = tasks.filter((t) => !t.completed && t.priority === 'urgent');
  const allDone = pendingTasks.length === 0 && tasks.length > 0;

  // All tasks done greeting
  if (allDone) {
    if (voiceStyle === 'calm') {
      return `${timeGreeting}, ${name}. All your tasks for today are already complete. Take a breath... You've done beautifully. Enjoy your day.`;
    } else if (voiceStyle === 'energetic') {
      return `${timeGreeting}, ${name}! BOOM! Every single task for today is done! You are absolutely CRUSHING it! Go out there and OWN your day! LET'S GO!`;
    } else {
      return `${timeGreeting}, ${name}. All scheduled tasks for today have been completed. Well executed. Enjoy the rest of your day.`;
    }
  }

  const taskCount = pendingTasks.length;
  const taskWord = taskCount === 1 ? 'task' : 'tasks';

  let greeting = '';

  // Opening
  if (voiceStyle === 'calm') {
    greeting += `${timeGreeting}, ${name}. Take a breath... `;
  } else if (voiceStyle === 'energetic') {
    greeting += `${timeGreeting}, ${name}! Let's GO! `;
  } else {
    greeting += `${timeGreeting}, ${name}. `;
  }

  // Badge mention
  if (badgeLevel) {
    const badgeNames = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
    greeting += `You're on a ${badgeNames[badgeLevel]} streak ${voiceStyle === 'energetic' ? '— absolutely incredible! ' : '— well done. '}`;
  }

  // Focus word
  if (focusWord) {
    greeting += `Your focus word this week is ${focusWord}. `;
  }

  // Task count
  greeting += `You have ${taskCount} ${taskWord} ${voiceStyle === 'energetic' ? 'lined up and ready to crush' : 'for today'}. `;

  // Urgent tasks first
  if (urgentTasks.length > 0) {
    const urgentNames = urgentTasks.map((t) => t.text).join(', and ');
    greeting += `Starting with your urgent ${urgentTasks.length === 1 ? 'one' : 'ones'}: ${urgentNames}. `;
  }

  // All tasks (non-urgent pending)
  const regularTasks = pendingTasks.filter((t) => t.priority !== 'urgent');
  if (regularTasks.length > 0) {
    const taskNames = regularTasks.map((t) => t.text).join(', ');
    greeting += `Here's what's on your plate: ${taskNames}. `;
  }

  // Daily quote
  const quote = getDailyQuote();
  greeting += `${quote}. `;

  // Sign-off
  if (voiceStyle === 'calm') {
    greeting += "You've got everything you need. Have a beautiful day.";
  } else if (voiceStyle === 'energetic') {
    greeting += "Let's make today absolutely UNSTOPPABLE! YOU GOT THIS!";
  } else {
    greeting += "Let's proceed. Have a productive day.";
  }

  return greeting;
}

// ==================== VOICE PREVIEW SAMPLES ====================

export const VOICE_SAMPLES: Record<VoiceStyle, string> = {
  calm: 'Hello. Take a gentle breath. Your day is ready, and you are ready for it.',
  energetic: "Hey! Let's GO! Your tasks are waiting and you are going to absolutely CRUSH them today!",
  formal: "Good morning. Your schedule for today has been prepared. Please proceed at your convenience.",
};

// ==================== SPEECH PLAYER ====================

export interface SpeechOptions {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStopped?: () => void;
  onBoundary?: (event: { charIndex: number }) => void;
}

export async function playGreeting(
  text: string,
  voiceStyle: VoiceStyle,
  options: SpeechOptions = {}
): Promise<void> {
  try {
    // Stop any current speech
    await Speech.stop();

    const params = VOICE_PARAMS[voiceStyle];

    Speech.speak(text, {
      ...params,
      language: 'en-US',
      onStart: options.onStart,
      onDone: options.onDone,
      onError: options.onError,
      onStopped: options.onStopped,
      onBoundary: options.onBoundary,
    });
  } catch (error) {
    console.error('Speech error:', error);
    options.onError?.(error as Error);
  }
}

export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
  } catch {}
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

export async function playVoicePreview(voiceStyle: VoiceStyle): Promise<void> {
  const sample = VOICE_SAMPLES[voiceStyle];
  await playGreeting(sample, voiceStyle);
}
