import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { getDailyQuote } from '../constants/quotes';
import { Task, UserProfile, VoiceStyle } from './taskService';
export { VoiceStyle };

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
  gentleman: {
    rate: 0.88, // Slightly faster for a more natural yet measured pace
    pitch: 0.75, // Rich, deep, and authoritative without sounding unnatural
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
    } else if (voiceStyle === 'gentleman') {
      return `${timeGreeting}, ${name}. It appears your agenda for today is complete. Impeccable work. I hope you enjoy a well-deserved rest.`;
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
  } else if (voiceStyle === 'gentleman') {
    const gentlemanOpeners = [
      `Greetings, ${name}. I trust you've had a moment's rest. `,
      `Hello again, ${name}. Your agenda is well-prepared, as expected. `,
      `Good to see you, ${name}. Shall we review your commitments for today? `,
      `Welcome back, ${name}. The stage is set for your success. `,
      `A pleasure to assist you, ${name}. Let's look at what's ahead. `,
    ];
    greeting += gentlemanOpeners[Math.floor(Math.random() * gentlemanOpeners.length)];
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
  } else if (voiceStyle === 'gentleman') {
    greeting += `The stage is set, ${name}. Your agenda is waiting. Shall we begin?`;
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
  gentleman: "Good morning. I've prepared your agenda for the day. Everything is in order for you to succeed.",
};

// ==================== SPEECH PLAYER ====================

export interface SpeechOptions {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStopped?: () => void;
  onBoundary?: (event: { charIndex: number }) => void;
}

// Global flag to prevent overlapping briefings
let isBriefingActive = false;

export async function playGreeting(
  text: string,
  voiceStyle: VoiceStyle,
  options: SpeechOptions = {}
): Promise<void> {
  if (isBriefingActive) {
    console.log('[Speech] Briefing already in progress, skipping overlap.');
    return;
  }

  try {
    isBriefingActive = true;
    console.log('[Speech] Requesting audio focus and preparing voice engine...');

    // 1. Configure Audio for reliable playback on Android
    // Using numeric values: 1 = INTERRUPTION_MODE_ANDROID_DO_NOT_MIX / INTERRUPTION_MODE_IOS_DO_NOT_MIX
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: 1, 
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
    });

    console.log('[Speech] Audio mode configured for priority playback.');

    // 2. Stop any current speech with a tiny grace period
    await Speech.stop();
    await new Promise(resolve => setTimeout(resolve, 50));

    const params = VOICE_PARAMS[voiceStyle];
    
    let voiceIdentifier: string | undefined = undefined;

    // Optimization: Cache voices to avoid await latency on every play
    let voices: Speech.Voice[] = [];
    try {
      voices = await Promise.race([
        Speech.getAvailableVoicesAsync(),
        new Promise<Speech.Voice[]>((_, reject) => setTimeout(() => reject('timeout'), 400))
      ]) as Speech.Voice[];
    } catch (e) {
      console.log('[Speech] Voice fetch timeout/error, using default');
    }

    if (voiceStyle === 'gentleman' || voiceStyle === 'formal') {
      const maleVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const lang = v.language.toLowerCase();
        return lang.startsWith('en') && (
          name.includes('male') || 
          name.includes('guy') || 
          name.includes('gentleman') ||
          name.includes('george') || 
          name.includes('oliver') || 
          name.includes('daniel') ||
          name.includes('en-us-x-sfg-local') // Common high-quality Android male voice
        );
      });
      if (maleVoice) voiceIdentifier = maleVoice.identifier;
    }

    Speech.speak(text, {
      ...params,
      voice: voiceIdentifier,
      language: 'en-US',
      onStart: () => {
        console.log('[Speech] Voice transmission started');
        options.onStart?.();
      },
      onDone: () => {
        console.log('[Speech] Voice transmission complete');
        isBriefingActive = false;
        options.onDone?.();
      },
      onError: (error) => {
        console.error('[Speech] Voice transmission error:', error);
        isBriefingActive = false;
        options.onError?.(error as any);
      },
      onStopped: () => {
        isBriefingActive = false;
        options.onStopped?.();
      },
      onBoundary: options.onBoundary,
    });
  } catch (error) {
    console.error('Speech setup error:', error);
    isBriefingActive = false;
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
